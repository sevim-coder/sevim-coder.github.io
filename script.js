document.addEventListener('DOMContentLoaded', () => {
    const newsContainer = document.getElementById('news-container');
    const paginationContainer = document.getElementById('pagination-container'); // Pagination için yeni
    const itemsPerPage = 10;
    let allTopNews = [];

    async function fetchNews() {
        try {
            const response = await fetch(`haberler.json?v=${new Date().getTime()}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const news = await response.json();
            if (news.length === 0) {
                newsContainer.innerHTML = '<p class="loading">Günün öne çıkan haberi henüz yok.</p>';
                return;
            }

            // Haberleri önem skoruna göre büyükten küçüğe sırala
            allTopNews = news.sort((a, b) => (b.onem_skoru || 0) - (a.onem_skoru || 0));
            
            displayPage(1);
            setupPagination();

        } catch (error) {
            console.error("Haberler yüklenirken hata oluştu:", error);
            newsContainer.innerHTML = '<p class="error">Haberler yüklenemedi.</p>';
        }
    }

    function displayPage(page) {
        newsContainer.innerHTML = '';
        page--; 

        const start = itemsPerPage * page;
        const end = start + itemsPerPage;
        const paginatedItems = allTopNews.slice(start, end);

        paginatedItems.forEach(article => {
            const card = document.createElement('article');
            card.className = 'news-card';
            let imageHtml = article.resim ? `<img src="${article.resim}" alt="${article.baslik}" onerror="this.style.display='none'">` : '';
            let scoreHtml = `<div class="score-badge" title="Bu haber, günün trendleriyle ${article.onem_skoru} kez eşleşti.">🔥 Gündem Puanı: ${article.onem_skoru}</div>`;

            card.innerHTML = `
                ${imageHtml}
                ${scoreHtml}
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
        window.scrollTo(0, 0);
    }

    function setupPagination() {
        if (!paginationContainer) return;
        paginationContainer.innerHTML = "";
        const pageCount = Math.ceil(allTopNews.length / itemsPerPage);
        if (pageCount <= 1) return; // Tek sayfa varsa sayfa numaralarını gösterme

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
