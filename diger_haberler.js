document.addEventListener('DOMContentLoaded', () => {
    const newsContainer = document.getElementById('news-container');
    const paginationContainer = document.getElementById('pagination-container');
    const itemsPerPage = 10;
    const topNewsToShow = 10; // Ana sayfada gösterilen "öne çıkan" haber sayısı
    let allOtherNews = [];
    let currentPage = 1;

    async function fetchNews() {
        try {
            const response = await fetch(`haberler.json?v=${new Date().getTime()}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const news = await response.json();
            if (news.length === 0) {
                newsContainer.innerHTML = '<p class="loading">Henüz haber yok.</p>';
                return;
            }

            const sortedNews = news.sort((a, b) => (b.onem_skoru || 0) - (a.onem_skoru || 0));
            // *** DÜZELTME: Ana sayfadaki en önemli haberleri atlayıp geri kalanını al ***
            allOtherNews = sortedNews.slice(topNewsToShow); 

            if(allOtherNews.length === 0) {
                newsContainer.innerHTML = '<p class="loading">Günün diğer gelişmeleri henüz yok.</p>';
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
        window.scrollTo(0, 0);
        updatePaginationUI();
    }
    
    function updatePaginationUI() {
        if (!paginationContainer) return;
        paginationContainer.innerHTML = "";
        const pageCount = Math.ceil(allOtherNews.length / itemsPerPage);
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
