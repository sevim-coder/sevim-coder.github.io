import os
import feedparser
import json
import google.generativeai as genai
from datetime import datetime
import re
import requests
from bs4 import BeautifulSoup
from collections import Counter
import nltk

# --- Ayarlar ---
RSS_FEEDS = {
    "Sözcü Son Dakika": "https://www.sozcu.com.tr/feeds-son-dakika", "Sözcü": "https://www.sozcu.com.tr/feed/",
    "T24": "https://t24.com.tr/rss", "Cumhuriyet": "https://www.cumhuriyet.com.tr/rss",
    "BBC Türkçe": "https://feeds.bbci.co.uk/turkce/rss.xml", "DW Türkçe": "https://rss.dw.com/rdf/rss-tur-all",
    "NTV": "https://www.ntv.com.tr/gundem.rss", "Euronews Türkçe": "http://tr.euronews.com/rss",
    "Anka Haber Ajansı": "https://ankahaber.net/feed/"
}
PROCESSED_URLS_FILE = 'processed_urls.txt'
OUTPUT_JSON_FILE = 'haberler.json'

# --- NLTK Kurulumu ve Stopwords ---
try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/stopwords')
except nltk.downloader.DownloadError:
    nltk.download('punkt')
    nltk.download('stopwords')

from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize

TURKISH_STOPWORDS = set(stopwords.words('turkish')) | {'bir', 've', 'ile', 'ama', 'için', 'bu', 'o', 'şu', 'ne', 'zaman', 'daha', 'sonra', 'dedi'}


# --- Güvenli API Anahtarı Yükleme ---
try:
    gemini_api_key = os.environ['GEMINI_API_KEY']
    genai.configure(api_key=gemini_api_key)
except KeyError:
    print("HATA: GEMINI_API_KEY bulunamadı."); exit()

# --- YARDIMCI FONKSİYONLAR ---
def clean_html(raw_html):
    return re.sub(re.compile('<.*?>'), '', raw_html).strip()

def get_trending_keywords(all_entries, top_n=15):
    """Tüm haber başlıklarından trend olan anahtar kelimeleri çıkarır."""
    print("-> Trend analizi başlatılıyor...")
    all_titles_text = ' '.join([entry.title for entry in all_entries])
    tokens = word_tokenize(all_titles_text.lower())
    
    # Stopwords ve tek karakterli tokenları filtrele
    filtered_tokens = [word for word in tokens if word.isalpha() and word not in TURKISH_STOPWORDS and len(word) > 2]
    
    # En çok geçen kelimeleri bul
    most_common_words = [word for word, count in Counter(filtered_tokens).most_common(top_n)]
    print(f"-> Günün Trendleri: {most_common_words}")
    return set(most_common_words)

def calculate_trend_score(text, trending_keywords):
    """Metnin trend kelimeleri ne kadar içerdiğine göre puan hesaplar."""
    score = 0
    text_lower = text.lower()
    for keyword in trending_keywords:
        if keyword in text_lower:
            score += 1
    return score

def fetch_article_text(url):
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        paragraphs = soup.find_all('p')
        article_text = '\n'.join([p.get_text() for p in paragraphs])
        print(f"--> Sayfadan {len(article_text)} karakter metin çekildi.")
        return article_text if len(article_text) > 100 else None
    except Exception as e:
        print(f"--> Web sayfası okuma hatası: {e}"); return None

def summarize_with_gemini(title, text_to_summarize):
    model = genai.GenerativeModel('gemini-1.5-flash')
    prompt = f"Bir haber spikeri gibi davranarak aşağıdaki haberi videoda sunulacak şekilde, dikkat çekici ve özgün bir dille yeniden yorumla. Sadece yorumlanmış metni ver.\n\nHaber Başlığı: {title}\n\nHaber Metni: {text_to_summarize}\n\nYorumlanmış Metin:"
    try:
        response = model.generate_content(prompt); return response.text.strip()
    except Exception as e:
        print(f"--> Gemini API hatası: {e}"); return None

# --- Dosya İşlemleri (Değişiklik yok) ---
def get_processed_urls():
    if not os.path.exists(PROCESSED_URLS_FILE): return set()
    with open(PROCESSED_URLS_FILE, 'r') as f: return set(line.strip() for line in f)
def save_processed_url(url):
    with open(PROCESSED_URLS_FILE, 'a') as f: f.write(url + '\n')
def get_existing_news():
    if not os.path.exists(OUTPUT_JSON_FILE): return []
    try:
        with open(OUTPUT_JSON_FILE, 'r', encoding='utf-8') as f: return json.load(f)
    except: return []
def save_news_to_json(news_list):
    with open(OUTPUT_JSON_FILE, 'w', encoding='utf-8') as f: json.dump(news_list, f, ensure_ascii=False, indent=4)

# --- ANA İŞ AKIŞI ---
def main():
    print("İşlem başlıyor...")
    processed_urls, existing_news, new_articles_found = get_processed_urls(), get_existing_news(), 0
    all_new_entries = []

    # 1. Adım: Tüm kaynaklardan yeni haberleri topla
    for source, url in RSS_FEEDS.items():
        feed = feedparser.parse(url)
        for entry in feed.entries:
            if entry.link not in processed_urls:
                entry.source_name = source # Kaynak adını girişe ekle
                all_new_entries.append(entry)
    
    if not all_new_entries:
        print("İşlenecek yeni haber bulunamadı."); print("İşlem tamamlandı."); return

    # 2. Adım: Trend analizi yap
    trending_keywords = get_trending_keywords(all_new_entries)

    # 3. Adım: Yeni haberleri işle ve puanla
    for entry in reversed(all_new_entries): # Eskiden yeniye işle
        print(f"-> {entry.source_name}: {entry.title}")
        content = clean_html(entry.get('summary', entry.get('description', '')))
        
        # Trend puanı hesapla
        trend_score = calculate_trend_score(entry.title, trending_keywords)

        if len(content) < 50:
            print("--> RSS özeti kısa. Sayfanın tamamı okunuyor...")
            content = fetch_article_text(entry.link)
            if not content: print("--> Sayfadan yeterli metin çekilemedi, atlanıyor."); continue
        
        rewritten_text = summarize_with_gemini(entry.title, content)
        
        if rewritten_text:
            image_url = ''
            if 'media_content' in entry and entry.media_content: image_url = entry.media_content[0]['url']
            
            new_article = {
                'kaynak': entry.source_name, 'orjinal_link': entry.link, 'baslik': entry.title,
                'yorumlanmis_metin': rewritten_text, 'resim': image_url,
                'onem_skoru': trend_score, # PUAN BURADA EKLENDİ
                'tarih': datetime.now().strftime("%d/%m/%Y %H:%M")
            }
            existing_news.insert(0, new_article)
            save_processed_url(entry.link)
            new_articles_found += 1
    
    if new_articles_found > 0:
        print(f"Toplam {new_articles_found} yeni haber işlendi.")
        save_news_to_json(existing_news)
        print("haberler.json dosyası güncellendi.")
    else: print("Yeni haber bulunamadı.")
    print("İşlem tamamlandı.")

if __name__ == "__main__": main()
