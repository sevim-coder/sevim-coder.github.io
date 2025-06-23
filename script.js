document.addEventListener('DOMContentLoaded', () => {
    const newsContainer = document.getElementById('news-container');
    const paginationContainer = document.getElementById('pagination-container');
    const itemsPerPage = 10;
    const TRENDING_SCORE_THRESHOLD = 4; // Puanı bu değerden büyük olanlar "Öne Çıkan" sayılır
    let allTopNews = [];
    let currentPage = 1;

    async function fetchNews() {
        try {
            const response = await fetch(`haberler.json?v=${new Date().getTime()}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const news = await response.json(); // Bu liste zaten en yeniden en eskiye sıralı
            if (news.length === 0) {
                newsContainer.innerHTML = '<p class="loading">Günün öne çıkan haberi henüz yok.</p>';
                return;
            }

            // Haberleri sıralamak yerine puana göre FİLTRELE
            allTopNews = news.filter(article => (article.onem_skoru || 0) > TRENDING_SCORE_THRESHOLD);
            
            if (allTopNews.length === 0) {
                newsContainer.innerHTML = '<p class="loading">Günün öne çıkan haberi henüz yok.</p>';
                paginationContainer.style.display = 'none';
                return;
            }
            
            displayPage(currentPage);

        } catch (error) {
            console.error("Haberler yüklenirken hata oluştu:", error);
            newsContainer.innerHTML = '<p class="error">Haberler yüklenemedi.</p>';
        }
    }

    function displayPage(page) {
        currentPage = page;
        newsContainer.innerHTML = '';
        const start = itemsPerPage * (page - 1);
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
        updatePaginationUI();
    }

    function updatePaginationUI() {
        if (!paginationContainer) return;
        paginationContainer.innerHTML = "";
        const pageCount = Math.ceil(allTopNews.length / itemsPerPage);
        if (pageCount <= 1) return;

        const prevBtn = createPaginationLink(currentPage - 1, 'Geri', false, currentPage === 1);
        paginationContainer.appendChild(prevBtn);

        const pagesToShow = new Set();
        pagesToShow.add(1);
        pagesToShow.add(pageCount);
        pagesToShow.add(currentPage);
        if (currentPage > 1) pagesToShow.add(currentPage - 1);
        if (currentPage > 2) pagesToShow.add(currentPage - 2);
        if (currentPage < pageCount) pagesToShow.add(currentPage + 1);
        if (currentPage < pageCount - 1) pagesToShow.add(currentPage + 2);

        const sortedPages = Array.from(pagesToShow).sort((a, b) => a - b);
        
        let lastPage = 0;
        for (const pageNum of sortedPages) {
            if (lastPage !== 0 && pageNum > lastPage + 1) {
                const ellipsis = document.createElement('span');
                ellipsis.innerText = '...';
                paginationContainer.appendChild(ellipsis);
            }
            const pageLink = createPaginationLink(pageNum, pageNum, pageNum === currentPage, false);
            paginationContainer.appendChild(pageLink);
            lastPage = pageNum;
        }

        const nextBtn = createPaginationLink(currentPage + 1, 'İleri', false, currentPage === pageCount);
        paginationContainer.appendChild(nextBtn);
    }

    function createPaginationLink(page, text, isActive, isDisabled) {
        const a = document.createElement('a');
        a.innerText = text;
        if (isActive) a.classList.add('active');
        if (isDisabled) {
            a.classList.add('disabled');
        } else {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                displayPage(page);
            });
        }
        return a;
    }

    fetchNews();
});
