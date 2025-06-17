document.addEventListener('DOMContentLoaded', () => {
    const newsContainer = document.getElementById('news-container');
    const paginationContainer = document.getElementById('pagination-container');
    const itemsPerPage = 10;
    let allOtherNews = [];

    async function fetchNews() {
        try {
            const response = await fetch(`haberler.json?v=${new Date().getTime()}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const news = await response.json();
            if (news.length === 0) {
                newsContainer.innerHTML = '<p class="loading">Henüz haber yok.</p>';
                return;
            }

            // Önem skoruna göre sırala
            const sortedNews = news.sort((a, b) => (b.onem_skoru || 0) - (a.onem_skoru || 0));
            // Ana sayfada gösterilen "öne çıkan" haberleri atla
            // Önemli: Buradaki mantık, ana sayfada her zaman en yüksek puanlıların gösterildiği varsayımına dayanır.
            // Puanı 5'ten düşük olanları veya ilk 10'dan sonrasını alarak daha çeşitli bir liste oluşturabiliriz.
            // Şimdilik en basit haliyle, en yüksek puanlı ilk 10 haberden sonrasını gösterelim.
            allOtherNews = sortedNews.slice(10); 

            if(allOtherNews.length === 0) {
                newsContainer.innerHTML = '<p class="loading">Günün diğer gelişmeleri henüz yok.</p>';
                return;
            }
            
            displayPage(1);
            setupPagination();

        } catch (error) {
            console.error("Haberler yüklenirken hata oluştu:", error);
            newsContainer.innerHTML = '<p class="error">Haberler yüklenemedi.</p>';
        }
    }

    function displayPage(page) {
        newsContainer.innerHTML = '';
        page--; // 0-indexed'e çevir

        const start = itemsPerPage * page;
        const end = start + itemsPerPage;
        const paginatedItems = allOtherNews.slice(start, end);

        paginatedItems.forEach(article => {
            const card = document.createElement('article');
            card.className = 'news-card';

            let imageHtml = article.resim ? `<img src="${article.resim}" alt="${article.baslik}" onerror="this.style.display='none'">` : '';
            
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
        
        window.scrollTo(0, 0); // Sayfa değiştirince yukarı çık
    }

    function setupPagination() {
        paginationContainer.innerHTML = "";
        const pageCount = Math.ceil(allOtherNews.length / itemsPerPage);
        if (pageCount <= 1) return;

        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement('a');
            btn.href = '#';
            btn.innerText = i;
            if (i === 1) btn.classList.add('active');

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const current = document.querySelector('.pagination a.active');
                if (current) current.classList.remove('active');
                btn.classList.add('active');
                displayPage(i);
            });
            paginationContainer.appendChild(btn);
        }
    }

    fetchNews();
});
