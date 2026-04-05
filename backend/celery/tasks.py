"""Celery-задачи для фоновой обработки и периодических запусков."""

from __future__ import annotations

import logging
import random
from datetime import datetime, timedelta, timezone

from celery import Task
from aiogram.exceptions import TelegramAPIError
from aiogram.types import ChatPermissions
from sqlalchemy import case, func, or_, select, update

from backend.celery.app import celery_app
from backend.celery.async_runner import run
from backend.services.bot_provider import resolve_for_bot_id, resolve_for_channel, resolve_master, use_user_bots
from backend.services.rate_limiter import RateLimitTimeout
from backend.database import CelerySessionLocal
from backend.models.bots import PendingApproval
from backend.models.channels import CaptchaFailAction
from backend.models.publications import (
    Publication,
    PublicationStatus as DBPublicationStatus,
    RepeatInterval as DBRepeatInterval,
)
from backend.schemas.publications.publishing import PublishResult
from backend.services.bot import RecurringMessageService, TriggerService
from backend.services.bot.bot_shortcodes import ShortcodeProcessor
from backend.services.channel import ChannelService
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id
from backend.services.publications.publication_query_service import PublicationQueryService
from backend.services.publications.series_service import SeriesService
from backend.services.publications import publisher, message_editor
from backend.services.publications.publish_helpers import make_notification_callback
from backend.services.publications.repeat_calculator import calculate_next_repeat_time
from backend.services.channel.backup_job_service import BackupJobService
from backend.services.channel.auto_delete_service import AutoDeleteService
from backend.utils.keyboard import build_keyboard

logger = logging.getLogger(__name__)


class RetriableTask(Task):
    """Базовый класс задач с безопасными настройками ретраев."""

    autoretry_for = (Exception,)
    retry_backoff = True
    retry_backoff_max = 60
    retry_jitter = True
    default_retry_delay = 5
    max_retries = 3


@celery_app.task(
    bind=True, name="backend.celery.tasks.publish_publication",
    soft_time_limit=120, time_limit=180, acks_late=True, max_retries=2,
)
def publish_publication(self, publication_id: int) -> str:
    """Опубликовать одну публикацию. Retry для разовых (не серийных) при неудаче."""

    result, is_series = run(publish_publication_async(publication_id))
    if result.startswith("publish_permanent_failed:"):
        logger.error("Постоянная ошибка (нет бота/канала): %s", result)
        return result
    if result.startswith("publish_failed:") and not is_series:
        raise self.retry(countdown=30 * (self.request.retries + 1))
    return result


async def publish_publication_async(publication_id: int) -> tuple[str, bool]:
    """Async-реализация публикации одной записи. Возвращает (result_str, is_series)."""

    next_id = None
    owner_id = None
    is_series = False
    async with CelerySessionLocal() as db:
        query_svc = PublicationQueryService(db)
        publication = await query_svc.get_publication(publication_id)
        if not publication or not publication.channels:
            await db.commit()
            return f"skip:{publication_id}", False

        if publication.status in (DBPublicationStatus.PUBLISHED, DBPublicationStatus.PARTIAL_SUCCESS):
            result = PublishResult(
                success=True, results=[], success_count=0, total_count=0,
                publication_id=publication_id, error="Already published",
            )
        elif publication.series_id and publication.series and publication.series.reply_to_previous:
            series_service = SeriesService(db)
            result = await series_service.publish_series_post(
                publication, lambda ch: resolve_for_channel(db, ch),
            )
        else:
            channel_service = ChannelService(db=db)
            result = await publisher.publish_to_channels(
                publication, db, channel_service,
                lambda ch: resolve_for_channel(db, ch),
                make_notification_callback(db),
                calculate_next_repeat_time,
            )

        pub = (await db.execute(
            select(Publication.series_id, Publication.series_order, Publication.owner_id)
            .where(Publication.id == publication_id)
        )).one_or_none()

        if pub and pub.series_id:
            is_series = True
            owner_id = pub.owner_id
            row = (await db.execute(
                select(Publication.id, Publication.scheduled_time).where(
                    Publication.series_id == pub.series_id,
                    Publication.series_order == pub.series_order + 1,
                    Publication.status == DBPublicationStatus.SCHEDULED,
                )
            )).one_or_none()
            if row:
                next_scheduled = row.scheduled_time
                now = datetime.now(timezone.utc)
                if next_scheduled and next_scheduled > now:
                    next_id = None
                else:
                    next_id = row.id

        await db.commit()

    if next_id:
        countdown = 30 if not result.success else 5
        publish_publication.apply_async(args=[next_id], queue="high", countdown=countdown)
        logger.info("Chained next series post: publication_id=%s, countdown=%s", next_id, countdown)
    elif is_series and owner_id:
        retry_failed_series_posts.apply_async(args=[owner_id], queue="high", countdown=10)
        logger.info("Series ended, queued retry check for owner=%s", owner_id)

    if result.success:
        return f"published:{publication_id}", is_series

    failed = [r for r in result.results if not r.success]
    for r in failed:
        logger.error(
            "channel_failed: publication_id=%s, channel=%s, permanent=%s, error=%s",
            publication_id, r.channel, r.permanent, r.error,
        )
    logger.warning(
        "publish partial/failed: publication_id=%s, %s/%s channels",
        publication_id, result.success_count, result.total_count,
    )
    if failed and all(r.permanent for r in failed):
        return f"publish_permanent_failed:{publication_id}", is_series
    return f"publish_failed:{publication_id}", is_series


async def reset_publication_for_retry(publication_id: int):
    """Сбросить статус публикации для повторной попытки."""

    async with CelerySessionLocal() as db:
        await db.execute(
            update(Publication)
            .where(Publication.id == publication_id)
            .values(status=DBPublicationStatus.SCHEDULED, published_time=None)
        )
        await db.commit()


@celery_app.task(name="backend.celery.tasks.retry_failed_series_posts")
def retry_failed_series_posts(owner_id: int) -> str:
    """После завершения всех серий юзера — ретраить FAILED посты."""

    return run(retry_failed_series_posts_async(owner_id))


async def retry_failed_series_posts_async(owner_id: int) -> str:
    """Проверить что все серии закончились, собрать FAILED и перезапустить."""

    async with CelerySessionLocal() as db:
        scheduled_count = (await db.execute(
            select(func.count()).select_from(Publication).where(
                Publication.owner_id == owner_id,
                Publication.series_id.isnot(None),
                Publication.status == DBPublicationStatus.SCHEDULED,
            )
        )).scalar()

        if scheduled_count > 0:
            logger.info("series_retry_skipped: owner=%s, %s posts still scheduled", owner_id, scheduled_count)
            return f"retry_skipped:{owner_id}:scheduled:{scheduled_count}"

        result = await db.execute(
            update(Publication)
            .where(
                Publication.owner_id == owner_id,
                Publication.series_id.isnot(None),
                Publication.status == DBPublicationStatus.FAILED,
            )
            .values(status=DBPublicationStatus.SCHEDULED, published_time=None)
            .returning(Publication.id)
        )
        failed_ids = list(result.scalars().all())
        await db.commit()

    if not failed_ids:
        logger.info("series_retry_none: owner=%s, no failed posts", owner_id)
        return f"retry_none:{owner_id}"

    for i, pub_id in enumerate(failed_ids):
        publish_publication.apply_async(args=[pub_id], queue="high", countdown=5 + i * 3)

    logger.info("series_retry_queued: owner=%s, %s failed posts re-queued", owner_id, len(failed_ids))
    return f"retry_queued:{owner_id}:{len(failed_ids)}"


@celery_app.task(name="backend.celery.tasks.delete_publication_messages", base=RetriableTask, max_retries=1)
def delete_publication_messages(publication_id: int) -> str:
    """Удалить Telegram-сообщения, связанные с публикацией."""

    return run(delete_publication_messages_async(publication_id))


async def delete_publication_messages_async(publication_id: int) -> str:
    """Async-реализация удаления Telegram-сообщений публикации и самой публикации."""

    async with CelerySessionLocal() as db:
        query_svc = PublicationQueryService(db)
        publication = await query_svc.get_publication(publication_id)
        if not publication:
            return f"not_found:{publication_id}"
        await message_editor.delete_telegram_messages(
            publication, db, lambda ch: resolve_for_channel(db, ch),
        )
        await db.delete(publication)
        await db.commit()
        return f"deleted_messages:{publication_id}"


@celery_app.task(name="backend.celery.tasks.republish_publication", soft_time_limit=120, time_limit=180)
def republish_publication(publication_id: int) -> str:
    """Переопубликовать публикацию (без RetriableTask — retry в channel_sender)."""

    return run(republish_publication_async(publication_id))


async def republish_publication_async(publication_id: int) -> str:
    """Async-реализация переопубликации."""

    async with CelerySessionLocal() as db:
        query_svc = PublicationQueryService(db)
        publication = await query_svc.get_publication(publication_id)
        if not publication or not publication.channels:
            return f"skip:{publication_id}"
        await publisher.republish(
            publication, db, lambda ch: resolve_for_channel(db, ch), calculate_next_repeat_time,
        )
        await db.commit()
        return f"republished:{publication_id}"


@celery_app.task(name="backend.celery.tasks.process_scheduled_publications")
def process_scheduled_publications() -> str:
    """Найти публикации, которые пора публиковать, и поставить их в очередь."""

    return run(process_scheduled_publications_async())


async def process_scheduled_publications_async() -> str:
    """Атомарный UPDATE + enqueue: помечает published_time и ставит задачу в Celery."""

    async with CelerySessionLocal() as db:
        now = datetime.now(timezone.utc)
        stmt = (
            update(Publication)
            .where(
                Publication.status == DBPublicationStatus.SCHEDULED,
                Publication.scheduled_time <= now,
                Publication.published_time.is_(None),
            )
            .values(published_time=now)
            .returning(Publication.id)
        )
        result = await db.execute(stmt)
        ids = list(result.scalars().all())
        await db.commit()

    for publication_id in ids:
        publish_publication.apply_async(args=[publication_id], queue="high")

    return f"queued_publish:{len(ids)}"


@celery_app.task(name="backend.celery.tasks.process_auto_delete")
def process_auto_delete() -> str:
    """Найти публикации для автоудаления и поставить удаление в очередь."""

    return run(process_auto_delete_async())


async def process_auto_delete_async() -> str:
    """Async-реализация постановки задач автоудаления в очередь."""

    async with CelerySessionLocal() as db:
        now = datetime.now(timezone.utc)

        delete_delay = case(
            (Publication.auto_delete_seconds.isnot(None), Publication.auto_delete_seconds),
            else_=Publication.auto_delete_hours * 3600,
        )

        q = (
            select(Publication.id)
            .where(
                Publication.status == DBPublicationStatus.PUBLISHED,
                Publication.published_time.isnot(None),
                or_(
                    Publication.auto_delete_hours.isnot(None),
                    Publication.auto_delete_seconds.isnot(None),
                ),
                Publication.published_time
                + func.make_interval(0, 0, 0, 0, 0, 0, delete_delay)
                <= now,
            )
            .limit(50)
        )

        result = await db.execute(q)
        ids = list(result.scalars().all())

    for publication_id in ids:
        delete_publication_messages.apply_async(args=[publication_id], queue="default")

    return f"queued_delete:{len(ids)}"


@celery_app.task(name="backend.celery.tasks.process_scheduled_triggers")
def process_scheduled_triggers() -> str:
    """Выполнить отложенные задачи триггеров."""

    return run(process_scheduled_triggers_async())


async def process_scheduled_triggers_async() -> str:
    """Async-реализация выполнения задач триггеров."""

    async with CelerySessionLocal() as db:
        service = TriggerService(db)
        tasks = await service.get_pending_tasks(limit=50)
        for task in tasks:
            try:
                bot_id = task.trigger.bot_id if task.trigger else None
                if bot_id:
                    telegram_bot = await resolve_for_bot_id(db, bot_id)
                elif use_user_bots():
                    raise ValueError(f"Trigger task {task.id} has no bot_id")
                else:
                    telegram_bot = resolve_master()
                await service.execute_scheduled_task(task, telegram_bot)
            except Exception as exc:
                logger.error("trigger_task_failed: %s", exc)
        await db.commit()
        return f"processed_triggers:{len(tasks)}"


@celery_app.task(name="backend.celery.tasks.process_recurring_messages")
def process_recurring_messages() -> str:
    """Отправить ожидающие повторяющиеся сообщения."""

    return run(process_recurring_messages_async())


async def process_recurring_messages_async() -> str:
    """Async-реализация отправки повторяющихся сообщений."""

    async with CelerySessionLocal() as db:
        service = RecurringMessageService(db)
        pending = await service.get_pending(limit=50)
        for msg in pending:
            try:
                if msg.bot_id:
                    telegram_bot = await resolve_for_bot_id(db, msg.bot_id)
                elif use_user_bots():
                    raise ValueError(f"Recurring message {msg.id} has no bot_id")
                else:
                    telegram_bot = resolve_master()
                await service.send(msg, telegram_bot)
            except Exception as exc:
                logger.error("recurring_message_failed: %s", exc)
        await db.commit()
        return f"processed_recurring:{len(pending)}"


@celery_app.task(name="backend.celery.tasks.process_repeating_publications")
def process_repeating_publications() -> str:
    """Найти повторяющиеся публикации, которые пора переопубликовать, и поставить их в очередь."""

    return run(process_repeating_publications_async())


async def process_repeating_publications_async() -> str:
    """Async-реализация постановки задач переопубликации в очередь."""

    async with CelerySessionLocal() as db:
        now = datetime.now(timezone.utc)
        q = (
            select(Publication.id)
            .where(
                Publication.status.in_(
                    [DBPublicationStatus.PUBLISHED, DBPublicationStatus.PARTIAL_SUCCESS]
                ),
                Publication.repeat_interval != DBRepeatInterval.NEVER,
                Publication.next_repeat_time.isnot(None),
                Publication.next_repeat_time <= now,
            )
            .limit(50)
        )
        result = await db.execute(q)
        ids = list(result.scalars().all())

    for publication_id in ids:
        republish_publication.apply_async(args=[publication_id], queue="default")

    return f"queued_republish:{len(ids)}"


@celery_app.task(bind=True, name="backend.celery.tasks.delayed_delete_message", max_retries=5)
def delayed_delete_message(self, bot_id: int, chat_id: int, message_id: int) -> str:
    """Удалить одно сообщение в чате (используется для отложенного автоудаления)."""

    result = run(delayed_delete_message_async(bot_id, chat_id, message_id))
    if result.startswith("rate_limited:"):
        wait = int(result.split(":")[1])
        jitter = random.randint(0, max(wait // 2, 5))
        raise self.retry(countdown=wait + jitter)
    return result


@celery_app.task(bind=True, name="backend.celery.tasks.send_claim_messages", max_retries=10)
def send_claim_messages(self, bot_id: int, target_chat_ids: list[int], text: str) -> str:
    result = run(send_claim_messages_async(bot_id, target_chat_ids, text))
    if result.startswith("rate_limited:"):
        wait = int(result.split(":")[1])
        jitter = random.randint(0, max(wait // 2, 5))
        raise self.retry(countdown=wait + jitter)
    return result


async def send_claim_messages_async(bot_id: int, target_chat_ids: list[int], text: str) -> str:
    async with CelerySessionLocal() as db:
        telegram_bot = await resolve_for_bot_id(db, bot_id)
        try:
            for chat_id in target_chat_ids:
                await telegram_bot.send_message(chat_id=chat_id, text=text)
        except RateLimitTimeout as e:
            return f"rate_limited:{int(e.wait_seconds)}"
        await db.commit()
        return f"sent:{len(target_chat_ids)}"


@celery_app.task(bind=True, name="backend.celery.tasks.send_claim_to_admins", max_retries=10)
def send_claim_to_admins(
    self,
    bot_id: int,
    source_chat_id: int,
    reporter_user_id: int,
    reporter_message_id: int,
    text: str,
) -> str:
    result = run(send_claim_to_admins_async(
        bot_id, source_chat_id, reporter_user_id, reporter_message_id, text,
    ))
    if result.startswith("rate_limited:"):
        wait = int(result.split(":")[1])
        jitter = random.randint(0, max(wait // 2, 5))
        raise self.retry(countdown=wait + jitter)
    return result


async def send_claim_to_admins_async(
    bot_id: int,
    source_chat_id: int,
    reporter_user_id: int,
    reporter_message_id: int,
    text: str,
) -> str:
    async with CelerySessionLocal() as db:
        bot = await resolve_for_bot_id(db, bot_id)
        try:
            admins = await bot.bot.get_chat_administrators(source_chat_id)
        except TelegramAPIError as e:
            logger.warning("get_chat_administrators_failed: %s", e)
            return "admins_failed"

        # Admin actions are handled by AdminCallbackProcessor via admincall_* prefix.
        buttons = {
            "buttons": [[
                {"text": "Забанить", "callback_data": f"admincall_ban_{source_chat_id}_{reporter_user_id}_{reporter_message_id}"},
                {"text": "Удалить", "callback_data": f"admincall_del_{source_chat_id}_{reporter_user_id}_{reporter_message_id}"},
                {"text": "Игнорировать", "callback_data": f"admincall_ignore_{source_chat_id}_{reporter_user_id}_{reporter_message_id}"},
            ]]
        }

        sent = 0
        try:
            for admin in admins:
                uid = admin.user.id if admin and admin.user else None
                if not uid or uid == reporter_user_id:
                    continue
                try:
                    await bot.send_message(chat_id=uid, text=text, reply_markup=build_keyboard(buttons))
                    sent += 1
                except TelegramAPIError as e:
                    # Bot cannot message user who didn't start a dialog; ignore.
                    logger.info("send_admin_dm_failed: user=%s err=%s", uid, e)
        except RateLimitTimeout as e:
            return f"rate_limited:{int(e.wait_seconds)}"

        await db.commit()
        return f"sent_admins:{sent}"

async def delayed_delete_message_async(bot_id: int, chat_id: int, message_id: int) -> str:
    """Async-реализация удаления одного сообщения."""

    async with CelerySessionLocal() as db:
        telegram_bot = await resolve_for_bot_id(db, bot_id)
        service = AutoDeleteService(db)
        result = await service.safe_delete(telegram_bot, chat_id, message_id)
        await db.commit()
        return result


@celery_app.task(name="backend.celery.tasks.process_backup_job", max_retries=2, default_retry_delay=30)
def process_backup_job(job_id: int) -> str:
    return run(process_backup_job_async(job_id))


async def process_backup_job_async(job_id: int) -> str:
    async with CelerySessionLocal() as db:
        service = BackupJobService(db)
        has_more = await service.process(job_id)
        await db.commit()

    if has_more:
        process_backup_job.apply_async(args=[job_id], queue="low", countdown=3)
        logger.info("Chained next backup post: job_id=%s, countdown=3", job_id)

    return f"backup_job:{job_id}"


@celery_app.task(
    name="backend.celery.tasks.captcha_timeout_check",
    max_retries=2,
    default_retry_delay=5,
)
def captcha_timeout_check(
    bot_id: int,
    chat_id: int,
    user_id: int,
    captcha_message_id: int,
    pending_id: int,
) -> str:
    return run(captcha_timeout_check_async(
        bot_id, chat_id, user_id, captcha_message_id, pending_id,
    ))


async def captcha_timeout_check_async(
    bot_id: int,
    chat_id: int,
    user_id: int,
    captcha_message_id: int,
    pending_id: int,
) -> str:
    async with CelerySessionLocal() as db:
        result = await db.execute(
            select(PendingApproval).where(PendingApproval.id == pending_id)
        )
        pending = result.scalar_one_or_none()

        if not pending or pending.is_approved:
            bot = await resolve_for_bot_id(db, bot_id)
            try:
                await bot.delete_message(chat_id=chat_id, message_id=captcha_message_id)
            except TelegramAPIError as exc:
                logger.error("captcha_delete_message_failed: %s", exc)
            return f"captcha_already_resolved:{pending_id}"

        channel = await get_channel_by_telegram_id(db, chat_id, bot_id=bot_id)

        fail_action = CaptchaFailAction.KICK
        fail_duration = None
        fail_text = None
        shortcode_context = None
        if channel:
            fail_action = channel.captcha_fail_action or CaptchaFailAction.KICK
            fail_duration = channel.captcha_fail_duration_seconds
            fail_text = channel.captcha_message_fail

        bot = await resolve_for_bot_id(db, bot_id)

        try:
            until = None
            if fail_action == CaptchaFailAction.MUTE:
                if fail_duration:
                    until = datetime.now(timezone.utc) + timedelta(seconds=fail_duration)
                await bot.restrict_chat_member(
                    chat_id=chat_id,
                    user_id=user_id,
                    permissions=ChatPermissions(
                        can_send_messages=False,
                        can_send_audios=False,
                        can_send_documents=False,
                        can_send_photos=False,
                        can_send_videos=False,
                        can_send_video_notes=False,
                        can_send_voice_notes=False,
                        can_send_polls=False,
                        can_send_other_messages=False,
                        can_add_web_page_previews=False,
                    ),
                    until_date=until,
                    use_independent_chat_permissions=True,
                )
            elif fail_action == CaptchaFailAction.BAN:
                if fail_duration:
                    until = datetime.now(timezone.utc) + timedelta(seconds=fail_duration)
                await bot.ban_chat_member(chat_id=chat_id, user_id=user_id, until_date=until)
            else:
                await bot.ban_chat_member(chat_id=chat_id, user_id=user_id)
                await bot.unban_chat_member(chat_id=chat_id, user_id=user_id, only_if_banned=True)

            await bot.delete_message(chat_id=chat_id, message_id=captcha_message_id)
        except TelegramAPIError as e:
            logger.error("Captcha fail action error for user %s: %s", user_id, e)

        if fail_text and pending:
            try:
                user_info = {"first_name": "", "username": "", "last_name": "", "id": user_id}
                try:
                    member = await bot.get_chat_member(chat_id=chat_id, user_id=user_id)
                    if member and member.user:
                        user_info = {
                            "first_name": member.user.first_name or "",
                            "username": member.user.username or "",
                            "last_name": member.user.last_name or "",
                            "id": member.user.id,
                        }
                except TelegramAPIError as exc:
                    logger.error("captcha_get_chat_member_failed: user=%s chat=%s %s", user_id, chat_id, exc)
                context = {"user": user_info}
                text = ShortcodeProcessor.process(fail_text, context)
                fail_msg = await bot.send_message(chat_id=chat_id, text=text)
                delayed_delete_message.apply_async(
                    args=[bot_id, chat_id, fail_msg.message_id],
                    countdown=10,
                )
            except TelegramAPIError as exc:
                logger.error("captcha_fail_text_send_failed: %s", exc)

        await db.commit()
    return f"captcha_timeout:{pending_id}"
