import os
import feedparser
import json
import google.generativeai as genai
from datetime import datetime
import re

# --- Ayarlar ---
RSS_FEEDS = {
    "Sözcü": "https://www.sozcu.com.tr/feed/",
    "BBC Türkçe": "https://feeds.bbci.co.uk/turkce/rss.xml",
    "DW Türkçe": "https://rss.dw.com/rdf/rss-tur-all",
    "Euronews Türkçe": "http://tr.euronews.com/rss",
    "Anka Haber Ajansı": "https://ankahaber.net/feed/"
}
PROCESSED_URLS_FILE = 'processed_urls.txt'
OUTPUT_JSON_FILE = 'haberler.json'
MAX_NEWS_COUNT = 30 # Sitede gösterilecek maksimum haber sayısı

# --- Güvenli API Anahtarı Yükleme ---
try:
    gemini_api_key = os.environ['GEMINI_API_KEY']
    genai.configure(api_key=gemini_api_key)
except KeyError:
    print("HATA: GEMINI_API_KEY bulunamadı. Lütfen GitHub Secrets'a eklediğinizden emin olun.")
    exit()

def clean_html(raw_html):
    """HTML etiketlerini temizler."""
    cleanr = re.compile('<.*?>')
    cleantext = re.sub(cleanr, '', raw_html)
    return cleantext

def get_processed_urls():
    if not os.path.exists(PROCESSED_URLS_FILE):
        return set()
    with open(PROCESSED_URLS_FILE, 'r') as f:
        return set(line.strip() for line in f)

def save_processed_url(url):
    with open(PROCESSED_URLS_FILE, 'a') as f:
        f.write(url + '\n')

def get_existing_news():
    if not os.path.exists(OUTPUT_JSON_FILE):
        return []
    try:
        with open(OUTPUT_JSON_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return []


def save_news_to_json(news_list):
    with open(OUTPUT_JSON_FILE, 'w', encoding='utf-8') as f:
        json.dump(news_list, f, ensure_ascii=False, indent=4)

def summarize_with_gemini(title, summary):
    model = genai.GenerativeModel('gemini-1.5-flash')
    prompt = f"""Bir haber spikeri gibi davran. Görevin, aşağıdaki haberi videoda sunulacak şekilde, dikkat çekici ve özgün bir dille yeniden yorumlamak. Sadece ve sadece videoda okunacak metni yaz. Giriş veya sonuç cümlesi ekleme.

Orijinal Başlık: {title}
Haber Özeti: {summary}

Yorumlanmış Haber Metni:"""
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Gemini API hatası: {e}")
        return None

def main():
    print("İşlem başlıyor: Yeni haberler kontrol ediliyor...")
    processed_urls = get_processed_urls()
    existing_news = get_existing_news()
    new_articles_found = 0

    for source, url in RSS_FEEDS.items():
        print(f"Kaynak taranıyor: {source}")
        feed = feedparser.parse(url)
        
        for entry in reversed(feed.entries):
            if entry.link not in processed_urls:
                print(f"-> Yeni haber bulundu: {entry.title}")
                
                content = clean_html(entry.get('summary', entry.get('description', '')))
                if not content or len(content) < 50:
                    print("--> Özet yetersiz, atlanıyor.")
                    continue
                
                rewritten_text = summarize_with_gemini(entry.title, content)
                
                if rewritten_text:
                    image_url = ''
                    if 'media_content' in entry and entry.media_content:
                        image_url = entry.media_content[0]['url']
                    elif 'links' in entry:
                         for link in entry.links:
                            if 'image' in link.get('type', ''):
                                image_url = link.href
                                break

                    new_article = {
                        'kaynak': source,
                        'orjinal_link': entry.link,
                        'baslik': entry.title,
                        'yorumlanmis_metin': rewritten_text,
                        'resim': image_url,
                        'tarih': datetime.now().strftime("%d/%m/%Y %H:%M")
                    }
                    existing_news.insert(0, new_article)
                    save_processed_url(entry.link)
                    new_articles_found += 1
                else:
                    print("--> Gemini haberi yorumlayamadı, atlanıyor.")

    if new_articles_found > 0:
        print(f"Toplam {new_articles_found} yeni haber işlendi.")
        updated_news_list = existing_news[:MAX_NEWS_COUNT]
        save_news_to_json(updated_news_list)
        print("haberler.json dosyası güncellendi.")
    else:
        print("Yeni haber bulunamadı.")
    print("İşlem tamamlandı.")

if __name__ == "__main__":
    main()