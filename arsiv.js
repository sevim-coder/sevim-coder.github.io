document.addEventListener('DOMContentLoaded', () => {
    const archiveContainer = document.getElementById('archive-container');

    async function fetchArchive() {
        try {
            const response = await fetch(`arsiv.json?v=${new Date().getTime()}`);
            
            if (!response.ok) {
                 if(response.status === 404) {
                    archiveContainer.innerHTML = '<p class="loading">Arşiv henüz boş. Haberler yarın akşam burada olacak.</p>';
                    return;
                 }
                 throw new Error(`HTTP error! status: ${response.status}`);
            }

            const archiveData = await response.json();
            
            if (Object.keys(archiveData).length === 0) {
                archiveContainer.innerHTML = '<p class="loading">Arşiv henüz boş.</p>';
                return;
            }

            archiveContainer.innerHTML = ''; // "Yükleniyor" yazısını temizle
            
            // Tarihleri en yeniden en eskiye doğru sırala
            const sortedDates = Object.keys(archiveData).sort().reverse();

            sortedDates.forEach(date => {
                const newsItems = archiveData[date];
                const section = document.createElement('section');
                section.className = 'archive-date-section';

                const header = document.createElement('div');
                header.className = 'archive-date-header';
                
                // Tarihi formatla
                const dateObj = new Date(date);
                const formattedDate = dateObj.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
                header.textContent = `${formattedDate} (${newsItems.length} haber)`;

                const newsContainer = document.createElement('div');
                newsContainer.className = 'archive-news-container';

                header.addEventListener('click', () => {
                    const isVisible = newsContainer.style.display === 'block';
                    newsContainer.style.display = isVisible ? 'none' : 'block';
                });

                newsItems.forEach(article => {
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

                section.appendChild(header);
                section.appendChild(newsContainer);
                archiveContainer.appendChild(section);
            });

        } catch (error) {
            console.error("Arşiv yüklenirken hata oluştu:", error);
            archiveContainer.innerHTML = '<p class="error">Arşiv yüklenemedi. Lütfen daha sonra tekrar deneyin.</p>';
        }
    }

    fetchArchive();
});
