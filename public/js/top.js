// 🌙 Toggle dark mode and save preference
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('mode', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
}

// Apply stored mode on load
if (localStorage.getItem('mode') === 'dark') {
    document.body.classList.add('dark-mode');
}

// 🍔 Toggle hamburger menu
function toggleMenu() {
    document.querySelector('.nav-links').classList.toggle('active');
    document.querySelector('.hamburger').classList.toggle('active');
}

// ⬆ Smooth scroll to top
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 🚀 Blog infinite scroll + content handling
document.addEventListener('DOMContentLoaded', async () => {
    const blogContainer = document.querySelector('#blog-posts');

    // Create helper elements dynamically so they never break
    const loader = document.createElement('div');
    loader.id = 'loader';
    loader.textContent = 'Loading...';
    loader.style.display = 'none';
    blogContainer.insertAdjacentElement('afterend', loader);

    const endMessage = document.createElement('p');
    endMessage.id = 'end-message';
    endMessage.textContent = '';
    endMessage.style.display = 'none';
    loader.insertAdjacentElement('afterend', endMessage);

    const sentinel = document.createElement('div');
    sentinel.id = 'scroll-sentinel';
    endMessage.insertAdjacentElement('afterend', sentinel);

    let page = 1;
    let isLoading = false;
    let hasMorePosts = true;

    // Fetch + render blog posts
    async function loadPosts() {
        if (isLoading || !hasMorePosts) return;
        isLoading = true;
        loader.style.display = 'block';

        try {
            const response = await fetch(`/api/blogs?page=${page}&limit=10`);
            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();

            // Stop if no more posts
           // Stop if no more posts
if (!data.blogs || data.blogs.length === 0) {
    hasMorePosts = false;
    loader.style.display = 'none';
    endMessage.style.display = 'block';
    return;
}


            // Render each blog
            data.blogs.forEach((blog, index) => {
                const article = document.createElement('article');
                article.classList.add('post');
                article.innerHTML = `
                    <h2>${blog.title}</h2>
                    <p class="date">Published on ${new Date(blog.publishedOn).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric'
                    })}</p>
                    <p>${blog.summary}</p>
                `;
                article.addEventListener('click', () => {
                    window.location.href = `/u/blog?id=${blog.blogId}`;
                });

                // Add with fade-in animation
                blogContainer.appendChild(article);
                setTimeout(() => article.classList.add('visible'), index * 150);
            });

            page += 1;
        } catch (err) {
            console.error('❌ Error fetching blogs:', err);
            blogContainer.insertAdjacentHTML(
                'beforeend',
                '<p class="error">Error loading blog posts. Please try again later.</p>'
            );
            hasMorePosts = false;
        } finally {
            isLoading = false;
            loader.style.display = 'none';
        }
    }

    // Initial load
    await loadPosts();

    // Use IntersectionObserver for infinite scroll
    const observer = new IntersectionObserver(async (entries) => {
        if (entries[0].isIntersecting && !isLoading && hasMorePosts) {
            await loadPosts();
        }
    }, { rootMargin: '200px' });

    observer.observe(sentinel);

    // Back-to-top button visibility
    const backToTopButton = document.querySelector('.back-to-top');
    window.addEventListener('scroll', () => {
        backToTopButton.classList.toggle('visible', window.scrollY > 300);
    });

    // 🍔 Hamburger click event
    document.querySelector('.hamburger').addEventListener('click', toggleMenu);
});
