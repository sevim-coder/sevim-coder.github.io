document.addEventListener('DOMContentLoaded', () => {
    const newsContainer = document.getElementById('news-container');

    async function fetchNews() {
        try {
            // Cache-busting: Tarayıcının her seferinde yeni dosyayı çekmesini sağla
            const response = await fetch(`haberler.json?v=${new Date().getTime()}`);
            
            if (!response.ok) {
                 throw new Error(`HTTP error! status: ${response.status}`);
            }

            const news = await response.json();
            
            if (news.length === 0) {
                newsContainer.innerHTML = '<p class="loading">Henüz yorumlanmış haber bulunmuyor. Lütfen daha sonra tekrar kontrol edin.</p>';
                return;
            }

            newsContainer.innerHTML = ''; // "Yükleniyor" yazısını temizle

            news.forEach(article => {
                const card = document.createElement('article');
                card.className = 'news-card';

                let imageHtml = '';
                if (article.resim) {
                    imageHtml = `<img src="${article.resim}" alt="${article.baslik}" onerror="this.style.display='none'">`;
                }

                card.innerHTML = `
                    ${imageHtml}
                    <div class="source">${article.kaynak}</div>
                    <h2>${article.baslik}</h2>
                    <p>${article.yorumlanmis_metin}</p>
                    <div class="footer">
                        <span>${article.tarih}</span>
                        <a href="${article.orjinal_link}" target="_blank">Haberin Kaynağı</a>
                    </div>
                `;
                newsContainer.appendChild(card);
            });

        } catch (error) {
            console.error("Haberler yüklenirken hata oluştu:", error);
            newsContainer.innerHTML = '<p class="error">Haberler yüklenemedi. Lütfen internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.</p>';
        }
    }

    fetchNews();
});