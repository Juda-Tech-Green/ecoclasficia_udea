// public/app.js
document.addEventListener("DOMContentLoaded", () => {
    const player = document.querySelector(".player");
    const playerImg = player.querySelector("img");
    const gameView = document.querySelector(".game_view");
    const stickyCan = document.querySelector(".sticky_can");
    const activeCan = document.getElementById("active-can");
    const wasteContainer = document.querySelector(".waste-container");

    // Sonidos
    const successSound = document.getElementById("success-sound");
    const wrongSound = document.getElementById("wrong-sound");

    // POSICIÓN INICIAL DEL JUGADOR (centro)
    let playerX = (gameView.clientWidth - player.offsetWidth) / 2;
    player.style.left = `${playerX}px`;

    // Ancho del mundo
    let worldWidth = gameView.clientWidth;

    // INPUT / VELOCIDAD
    const keys = { left: false, right: false };
    const moveSpeed = 6;

    // FACING y offsets
    let facing = "right";
    const offsets = { left: -45, right: 36 };

    // Función de utilidad (lerp)
    function lerp(a, b, t) { return a + (b - a) * t; }

    // Actualiza posición de sticky_can
    function updateStickyPosition(immediate = false) {
        const playerRect = player.getBoundingClientRect();
        const gameRect = gameView.getBoundingClientRect();
        const playerCenterX = (playerRect.left - gameRect.left) + playerRect.width / 2;
        const offset = (facing === "right") ? offsets.right : offsets.left;
        const targetX = playerCenterX + offset - (stickyCan.offsetWidth / 2);
        const currentLeft = parseFloat(stickyCan.style.left) || targetX;
        const smooth = immediate ? 1 : 0.25;
        const newLeft = lerp(currentLeft, targetX, smooth);
        stickyCan.style.left = `${newLeft}px`;
        activeCan.style.transform = (facing === "left") ? "scaleX(-1)" : "scaleX(1)";
    }

    // Mapeo de categorías a clases de caneca
    const categoryMap = {
        'organicos': { canClass: 'caneca-organic', correctBar: '.bar-correct-organic', wrongBar: '.bar-wrong-organic', sound: successSound },
        'reciclables': { canClass: 'caneca-reciclables', correctBar: '.bar-correct-reciclables', wrongBar: '.bar-wrong-reciclables', sound: successSound },
        'no_reciclables': { canClass: 'caneca-no-reciclables', correctBar: '.bar-correct-no-reciclables', wrongBar: '.bar-wrong-no-reciclables', sound: successSound }
    };

    // Mapeo de caneca activa a categoría
    function getActiveCanCategory() {
        if (activeCan.src.includes('green-trash-bin.png')) return 'organicos';
        if (activeCan.src.includes('white-trash-bin.png')) return 'reciclables';
        if (activeCan.src.includes('black-trash-bin.png')) return 'no_reciclables';
        return null;
    }

    // Función para actualizar barra
    function updateBar(barSelector, increment) {
        const bar = document.querySelector(barSelector);
        if (!bar) return;
        let height = parseFloat(bar.style.height) || 0;
        height = Math.min(100, height + increment);
        bar.style.height = `${height}%`;
    }

    // Función de colisión simple (bounding box)
    function checkCollision(rect1, rect2) {
        return rect1.left < rect2.right &&
               rect1.right > rect2.left &&
               rect1.bottom > rect2.top &&
               rect1.top < rect2.bottom;
    }

    // --- LÓGICA: Spawn y caída de residuos ---
    const categories = [
        'organicos',
        'reciclables',
        'no_reciclables'
    ];
    let activeWastes = []; // Track de residuos activos
    const maxWastes = 5;
    let spawnInterval;
    let residuesLeft = 30; // Inicial

    // Función para spawn un residuo aleatorio
    function spawnWaste() {
        if (activeWastes.length >= maxWastes || residuesLeft <= 0) return;

        const category = categories[Math.floor(Math.random() * categories.length)];
        const pngNum = Math.floor(Math.random() * 10) + 1;
        const imgPath = `/images/${category}/${pngNum}.png`;

        const waste = document.createElement('img');
        waste.src = imgPath;
        waste.classList.add('waste-item');
        waste.style.left = Math.random() * (gameView.clientWidth - 60) + 'px';
        waste.style.top = '-60px';
        waste.dataset.category = category; // Guarda categoría para colisión
        wasteContainer.appendChild(waste);

        activeWastes.push({ element: waste, y: 0 });

        residuesLeft--;
        document.querySelector('.health_container h2').textContent = `Residuos faltantes: ${residuesLeft}`;

        // Limpia cuando termine la animación (3s)
        setTimeout(() => {
            const index = activeWastes.findIndex(w => w.element === waste);
            if (index > -1) activeWastes.splice(index, 1);
            waste.remove();
        }, 3000);
    }

    // Inicia spawn cada 2.7s
    spawnInterval = setInterval(spawnWaste, 2700);

    // Loop principal
    function loop() {
        worldWidth = gameView.clientWidth;

        if (keys.left && !keys.right) {
            playerX -= moveSpeed;
            facing = "left";
            player.classList.add("flipped");
        } else if (keys.right && !keys.left) {
            playerX += moveSpeed;
            facing = "right";
            player.classList.remove("flipped");
        }

        const maxX = Math.max(0, worldWidth - player.offsetWidth + 200);
        if (playerX < 0) playerX = 0;
        if (playerX > maxX) playerX = maxX;

        player.style.left = `${playerX}px`;
        updateStickyPosition();

        // Actualizar residuos y chequear colisiones
        activeWastes.forEach((wasteObj, index) => {
            const waste = wasteObj.element;
            const wasteRect = waste.getBoundingClientRect();
            const canRect = stickyCan.getBoundingClientRect();

            if (checkCollision(canRect, wasteRect)) {
                const wasteCategory = waste.dataset.category;
                const activeCategory = getActiveCanCategory();

                const map = categoryMap[wasteCategory];
                const increment = 10; // Incremento por residuo (ajustable)

                if (activeCategory === wasteCategory) {
                    // Correcto: Llenar verde
                    updateBar(map.correctBar, increment);
                    successSound.play().catch(e => console.log('Audio play failed:', e));
                } else {
                    // Incorrecto: Llenar rojo
                    updateBar(map.wrongBar, increment);
                    wrongSound.play().catch(e => console.log('Audio play failed:', e));
                }

                // Remover residuo inmediatamente
                waste.remove();
                activeWastes.splice(index, 1);
            }
        });

        requestAnimationFrame(loop);
    }

    // Input events
    window.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") keys.left = true;
        if (e.key === "ArrowRight") keys.right = true;

        if (e.key === "1") activeCan.src = "/images/green-trash-bin.png";
        if (e.key === "2") activeCan.src = "/images/white-trash-bin.png";
        if (e.key === "3") activeCan.src = "/images/black-trash-bin.png";

        if (e.key === "g" || e.key === "G") {
            if (playerImg.src.includes("player.png")) {
                playerImg.src = "/images/player_w.png";
            } else {
                playerImg.src = "/images/player.png";
            }
        }
    });

    window.addEventListener("keyup", (e) => {
        if (e.key === "ArrowLeft") keys.left = false;
        if (e.key === "ArrowRight") keys.right = false;
    });

    setTimeout(() => updateStickyPosition(true), 50);

    window.addEventListener("resize", () => {
        worldWidth = gameView.clientWidth;
        const maxX = Math.max(0, worldWidth - player.offsetWidth + 200); // Corregido para consistencia
        if (playerX > maxX) playerX = maxX;
        player.style.left = `${playerX}px`;
        updateStickyPosition(true);
    });

    requestAnimationFrame(loop);
});