"""Колонки для облегчённой загрузки публикаций (load_only) — для compact-выдачи."""

from backend.models.channels import ChannelGroup as Channel
from backend.models.publications import Publication, Tag

PUB_COMPACT_COLUMNS = [
    Publication.id,
    Publication.status,
    Publication.content_type,
    Publication.text_content,
    Publication.formatted_content,
    Publication.media_urls,
    Publication.media_thumbnail_urls,
    Publication.media_file_ids,
    Publication.media_blur,
    Publication.inline_keyboard,
    Publication.poll_data,
    Publication.repeat_interval,
    Publication.scheduled_time,
    Publication.published_time,
    Publication.created_at,
    Publication.updated_at,
    Publication.owner_id,
    Publication.series_id,
    Publication.series_order,
    Publication.is_ad,
]

REPEAT_EXTRA_COLUMNS = [
    Publication.next_repeat_time,
    Publication.repeat_custom_days,
    Publication.repeat_custom_hours,
    Publication.repeat_end_time,
    Publication.repeat_custom_unit,
    Publication.repeat_custom_value,
    Publication.repeat_weekdays,
    Publication.repeat_month_days,
    Publication.repeat_year_month,
    Publication.repeat_year_days,
    Publication.repeat_excluded_dates,
]

CHANNEL_COMPACT_COLUMNS = [
    Channel.id,
    Channel.title,
    Channel.members_count,
    Channel.photo_url,
]

TAG_COMPACT_COLUMNS = [
    Tag.id,
    Tag.name,
    Tag.color,
]
