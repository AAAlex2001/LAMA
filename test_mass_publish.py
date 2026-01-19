import requests
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

# Конфигурация
BASE_URL = "https://lamaplanner.com/api"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwidHlwZSI6ImFjY2VzcyIsImV4cCI6MTc2ODg5NzAyMCwiaWF0IjoxNzY4ODEwNjIwLCJqdGkiOiI0RVFtQUp3T2pEWjF1X2xhMGhkVHJRIn0.wCYdvduncaXSAOIu8FTXb7Q9pLYsWDpUsozXrglExuY"

# Каналы где включить backup (все)
BACKUP_CHANNELS = [2, 3, 4, 5, 6]

# Канал для первоначальной публикации (создадим backups здесь)
SOURCE_CHANNEL = 6

# Целевые каналы для массовой ретрансляции
TARGET_CHANNELS = [2, 3, 4, 5]

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

def enable_backup_mode(channel_ids, backup_target=6):
    """Включить backup mode на каналах"""
    print(f"\n=== Включение backup mode на {len(channel_ids)} каналах ===")
    
    for channel_id in channel_ids:
        try:
            response = requests.post(
                f"{BASE_URL}/channels/{channel_id}/backup-mode",
                headers=HEADERS,
                json={
                    "backup_mode": "instant",
                    "backup_target_id": backup_target
                },
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✅ Backup mode включен для канала {channel_id} → target: {backup_target}")
            else:
                print(f"⚠️ Канал {channel_id}: {response.status_code} - {response.text[:100]}")
                
        except Exception as e:
            print(f"❌ Ошибка для канала {channel_id}: {e}")
            
        time.sleep(0.2)


def create_single_post(i, source_channel_id):
    """Создать один пост"""
    post_data = {
        "content_type": "text",
        "text_content": f"🧪 Тестовый пост #{i} для массовой ретрансляции\n\nВремя создания: {datetime.now().strftime('%H:%M:%S')}",
        "status": "draft",
        "channel_ids": [source_channel_id],
        "tag_names": ["test", "bulk-publish"],
        "disable_web_page_preview": True
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/publications/",
            headers=HEADERS,
            json=post_data,
            timeout=15
        )
        
        if response.status_code == 201:
            pub = response.json()
            return (True, i, pub["id"])
        else:
            return (False, i, response.status_code)
    except Exception as e:
        return (False, i, str(e))


def create_test_posts(count=100, source_channel_id=6):
    """Создать тестовые посты параллельно"""
    print(f"\n=== Создание {count} тестовых постов параллельно ===")
    publication_ids = []
    
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = {executor.submit(create_single_post, i, source_channel_id): i for i in range(1, count + 1)}
        
        for future in as_completed(futures):
            try:
                success, post_num, result = future.result()
                if success:
                    publication_ids.append(result)
                    print(f"✅ Создан пост #{post_num} (ID: {result})")
                else:
                    print(f"❌ Ошибка поста #{post_num}: {result}")
            except Exception as e:
                print(f"❌ Исключение: {e}")
    
    return publication_ids


def publish_posts(publication_ids):
    """Опубликовать посты в SOURCE каналы"""
    print(f"\n=== Публикация {len(publication_ids)} постов ===")
    published_count = 0
    
    for pub_id in publication_ids:
        try:
            response = requests.post(
                f"{BASE_URL}/publications/{pub_id}/publish",
                headers=HEADERS,
                timeout=30
            )
            
            if response.status_code == 200:
                published_count += 1
                print(f"✅ Опубликован пост ID: {pub_id}")
            else:
                print(f"❌ Ошибка публикации {pub_id}: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"❌ Ошибка при публикации {pub_id}: {e}")
            
        time.sleep(1)
    
    print(f"\n📊 Опубликовано: {published_count}/{len(publication_ids)}")
    return published_count


def convert_to_backups(publication_ids, source_channel_id=6):
    """Конвертировать publications в backups"""
    print(f"\n=== Конвертация {len(publication_ids)} постов в backups ===")
    
    try:
        response = requests.post(
            f"{BASE_URL}/bulk/publications-to-backup",
            headers=HEADERS,
            json={
                "publication_ids": publication_ids,
                "source_channel_id": source_channel_id
            },
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Создано backups: {result['created_backups']}")
            print(f"⏭️ Пропущено: {result['skipped']}")
            return True
        else:
            print(f"❌ Ошибка конвертации: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return False


def restore_to_channels(source_channel_id, target_channel_ids):
    """Запустить массовую ретрансляцию"""
    print(f"\n=== Запуск ретрансляции из канала {source_channel_id} ===")
    job_ids = []
    
    for target_id in target_channel_ids:
        try:
            response = requests.post(
                f"{BASE_URL}/channels/restore",
                headers=HEADERS,
                json={
                    "source_channel_id": source_channel_id,
                    "target_channel_id": target_id
                },
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                job_ids.append(result["job_id"])
                print(f"✅ Запущена задача #{result['job_id']} → канал {target_id}")
            else:
                print(f"❌ Ошибка для канала {target_id}: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"❌ Ошибка для канала {target_id}: {e}")
            
        time.sleep(0.5)
    
    return job_ids


def check_jobs(job_ids):
    """Проверить статус задач"""
    print(f"\n=== Проверка статуса {len(job_ids)} задач ===")
    
    for job_id in job_ids:
        try:
            response = requests.get(
                f"{BASE_URL}/channels/backup-jobs/{job_id}",
                headers=HEADERS,
                timeout=10
            )
            
            if response.status_code == 200:
                job = response.json()
                print(f"📋 Job #{job_id}: {job['status']} | "
                      f"Обработано: {job['processed_posts']}/{job['total_posts']} | "
                      f"Ошибок: {job['failed_posts']}")
            else:
                print(f"❌ Не удалось получить статус job #{job_id}")
                
        except Exception as e:
            print(f"❌ Ошибка проверки job #{job_id}: {e}")


if __name__ == "__main__":
    print("🚀 ТЕСТ МАССОВОЙ РЕТРАНСЛЯЦИИ")
    print("=" * 60)
    
    # Backup mode уже настроен на каналах 2,3,4,5,6 с backup_target_id=6
    print("\n✅ Backup mode: INSTANT (backup_target_id=6)\n")
    
    # Шаг 1: Создать тестовые посты в SOURCE канале
    post_ids = create_test_posts(count=100, source_channel_id=SOURCE_CHANNEL)
    
    if not post_ids:
        print("\n❌ Не удалось создать посты. Завершение.")
        exit(1)
    
    print(f"\n✅ Создано постов: {len(post_ids)}")
    print(f"📝 IDs: {post_ids}")
    
    # Шаг 2: Опубликовать в SOURCE канал
    published = publish_posts(post_ids)
    
    if published == 0:
        print("\n❌ Ни один пост не был опубликован. Завершение.")
        exit(1)
    
    print("\n⏳ Ждём 2 секунды, backups должны создаться автоматически...")
    time.sleep(2)
    
    # Проверяем наличие backups
    try:
        response = requests.get(
            f"{BASE_URL}/channels/{SOURCE_CHANNEL}/backed-posts?page=1&page_size=20",
            headers=HEADERS,
            timeout=10
        )
        if response.status_code == 200:
            backups = response.json()
            print(f"✅ Найдено backups: {backups.get('total', 0)}")
        else:
            print(f"⚠️ Не удалось проверить backups: {response.status_code}")
    except Exception as e:
        print(f"⚠️ Ошибка проверки backups: {e}")
    
    # Шаг 4: Запустить массовую ретрансляцию
    print("\n⏳ Ждём 2 секунды перед ретрансляцией...")
    time.sleep(2)
    
    job_ids = restore_to_channels(
        source_channel_id=SOURCE_CHANNEL,
        target_channel_ids=TARGET_CHANNELS
    )
    
    if not job_ids:
        print("\n❌ Не удалось запустить ретрансляцию.")
        exit(1)
    
    # Шаг 5: Мониторинг выполнения
    print("\n⏳ Ждём 5 секунд для начала обработки...")
    time.sleep(5)
    
    for i in range(6):  # Проверяем каждые 10 секунд в течение минуты
        check_jobs(job_ids)
        if i < 5:
            print("\n⏳ Ждём 10 секунд...\n")
            time.sleep(10)
    
    print("\n" + "=" * 60)
    print("✅ ТЕСТ ЗАВЕРШЁН")
    print("=" * 60)
    print(f"\n📊 Итого:")
    print(f"  • Создано постов: {len(post_ids)}")
    print(f"  • Опубликовано: {published}")
    print(f"  • Задач ретрансляции: {len(job_ids)}")
    print(f"\n💡 Проверьте статус через: GET {BASE_URL}/channels/backup-jobs")
