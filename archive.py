import json
import os
from datetime import datetime, timezone, timedelta

# Ayar: Türkiye saati (UTC+3)
TURKEY_TIMEZONE = timezone(timedelta(hours=3))

def run_archive():
    # Dosya yolları
    live_news_file = 'haberler.json'
    archive_file = 'arsiv.json'
    
    # 1. Canlı haber dosyasını oku
    if not os.path.exists(live_news_file):
        print(f"'{live_news_file}' bulunamadı. Arşivlenecek haber yok.")
        return
        
    try:
        with open(live_news_file, 'r', encoding='utf-8') as f:
            live_news = json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        live_news = []

    if not live_news:
        print("Canlı haber listesi boş. Arşivleme atlanıyor.")
        return

    # 2. Arşiv dosyasını oku veya yeni oluştur
    try:
        with open(archive_file, 'r', encoding='utf-8') as f:
            archive_data = json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        archive_data = {}
        
    # 3. Günün tarihini al (Türkiye saatine göre)
    today_str = datetime.now(TURKEY_TIMEZONE).strftime('%Y-%m-%d')
    
    # 4. Haberleri bugünün arşivine ekle
    if today_str not in archive_data:
        archive_data[today_str] = []
        
    # Mevcut arşivi koruyarak sadece yeni haberleri ekle
    # Canlı haberleri ters çevirerek günün ilk haberi en üste gelecek şekilde ekle
    archive_data[today_str] = live_news + archive_data[today_str]
    print(f"{len(live_news)} haber '{today_str}' tarihiyle arşive eklendi.")
    
    # 5. Arşiv dosyasını kaydet
    with open(archive_file, 'w', encoding='utf-8') as f:
        json.dump(archive_data, f, ensure_ascii=False, indent=4)
        
    # 6. Canlı haber dosyasını temizle
    with open(live_news_file, 'w', encoding='utf-8') as f:
        json.dump([], f)
    
    print("Arşivleme tamamlandı. Canlı haber listesi temizlendi.")

if __name__ == "__main__":
    run_archive()
