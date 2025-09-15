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
    const popSound = document.getElementById("pop-sound");

    // Modal Bootstrap
    const endModal = new bootstrap.Modal(document.getElementById('end-modal'));

    // POSICIÓN INICIAL DEL JUGADOR
    let playerX = (gameView.clientWidth - player.offsetWidth) / 2;
    player.style.left = `${playerX}px`;

    // Ancho del mundo
    let worldWidth = gameView.clientWidth;

    // INPUT / VELOCIDAD
    const keys = { left: false, right: false };
    const moveSpeed = 3;

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

    // Función para mostrar emoji feedback
    function showEmojiFeedback(emoji, type = 'correct', sound = null) {
        const emojiDiv = document.createElement('div');
        emojiDiv.className = `emoji-feedback ${type}`;
        emojiDiv.textContent = emoji;
        const canRect = stickyCan.getBoundingClientRect();
        const gameRect = gameView.getBoundingClientRect();
        const canCenterX = (canRect.left - gameRect.left) + canRect.width / 2;
        const canTop = canRect.top - gameRect.top - 50;
        emojiDiv.style.left = `${canCenterX}px`;
        emojiDiv.style.top = `${canTop}px`;
        gameView.appendChild(emojiDiv);
        if (sound) {
            sound.play().catch(e => console.log('Audio play failed:', e));
        }
        setTimeout(() => {
            if (emojiDiv.parentNode) emojiDiv.remove();
        }, 1500);
    }

    // Mapeo de categorías a clases de barra y caneca
    const categoryMap = {
        'organicos': { correctBar: '.bar-correct-organic', wrongBar: '.bar-wrong-organic', full: false },
        'reciclables': { correctBar: '.bar-correct-reciclables', wrongBar: '.bar-wrong-reciclables', full: false },
        'no_reciclables': { correctBar: '.bar-correct-no-reciclables', wrongBar: '.bar-wrong-no-reciclables', full: false }
    };

    // Mapeo de caneca activa a categoría
    function getActiveCanCategory() {
        if (activeCan.src.includes('green-trash-bin.png')) return 'organicos';
        if (activeCan.src.includes('white-trash-bin.png')) return 'reciclables';
        if (activeCan.src.includes('black-trash-bin.png')) return 'no_reciclables';
        return null;
    }

    // Función para actualizar barra
    function updateBar(barSelector, increment, type) {
        const bar = document.querySelector(barSelector);
        if (!bar) return;
        let height = parseFloat(bar.style.height) || 0;
        height = Math.min(100, height + increment);
        bar.style.height = `${height}%`;
        const category = barSelector.includes('organic') ? 'organicos' : barSelector.includes('reciclables') ? 'reciclables' : 'no_reciclables';
        const correctHeight = parseFloat(document.querySelector(categoryMap[category].correctBar).style.height || 0);
        const wrongHeight = parseFloat(document.querySelector(categoryMap[category].wrongBar).style.height || 0);
        if (correctHeight + wrongHeight >= 100) {
            categoryMap[category].full = true;
            showEmojiFeedback('➖', 'full', popSound);
        }
    }

    // Función de colisión
    function checkCollision(rect1, rect2) {
        return rect1.left < rect2.right &&
            rect1.right > rect2.left &&
            rect1.bottom > rect2.top &&
            rect1.top < rect2.bottom;
    }

    // Generar lista única de 30 residuos
    function generateWasteList() {
        const list = [];
        const categories = ['organicos', 'reciclables', 'no_reciclables'];
        categories.forEach(cat => {
            for (let i = 1; i <= 10; i++) {
                list.push({ category: cat, pngNum: i });
            }
        });
        for (let i = list.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [list[i], list[j]] = [list[j], list[i]];
        }
        return list;
    }

    let wasteList = generateWasteList();
    let activeWastes = [];
    const maxWastes = 5;
    let spawnInterval;
    let residuesLeft = 30;

    // Creación del div fill-overlay
    const fillOverlay = document.createElement('div');
    fillOverlay.classList.add('fill-overlay');
    gameView.appendChild(fillOverlay);

    // Agregar línea roja como límite
    const limitLine = document.createElement('hr');
    limitLine.classList.add('limit-line');
    gameView.appendChild(limitLine);

    // Residuos máximos que pueden pasar
    let missedResidues = 0;
    const maxMissed = 5;

    // Función para actualizar el llenado
    function updateFillLevel() {
        const baseHeight = 0; // Altura inicial en porcentaje (0% por defecto)
        const incrementPerMiss = 6; // Incremento por cada residuo (ajustable, e.g., 6% por residuo)
        const maxHeight = 30; // Límite máximo en porcentaje (30% como antes)
        const fillPercentage = baseHeight + (missedResidues * incrementPerMiss);
        fillOverlay.style.height = `${Math.min(fillPercentage, maxHeight)}%`;
        popSound.play().catch(e => console.log('Audio play failed:', e));
    }

    // Función para spawn un residuo
    function spawnWaste() {
        if (activeWastes.length >= maxWastes || wasteList.length === 0 || residuesLeft <= 0) return;
        const wasteItem = wasteList.shift();
        const imgPath = `/images/${wasteItem.category}/${wasteItem.pngNum}.png`;
        const waste = document.createElement('img');
        waste.src = imgPath;
        waste.classList.add('waste-item');
        waste.style.left = Math.random() * (gameView.clientWidth - 60) + 'px';
        waste.style.top = '-60px';
        waste.dataset.category = wasteItem.category;
        wasteContainer.appendChild(waste);
        activeWastes.push({ element: waste, y: 0 });
        residuesLeft--;
        document.querySelector('.health_container h2').textContent = `Residuos faltantes: ${residuesLeft}`;
        if (residuesLeft === 0) {
            setTimeout(() => showEndModal(), 4000);
        }
    }

    // Mostrar modal de fin
    function showEndModal(message = "¡Fin del Juego!") {
        const modalLabel = document.getElementById('end-modal-label');
        const endMessage = document.getElementById('end-message');
        const percentageElement = document.getElementById('percentage');
        if (modalLabel && endMessage && percentageElement) {
            modalLabel.textContent = message.includes("Demasiados") ? "¡Fin del Juego!" : "¡Fin del Juego!";
            if (message.includes("Demasiados")) {
                endMessage.textContent = "Demasiados residuos en el suelo.";
                percentageElement.textContent = "0"; // Opcional: no muestra porcentaje
            } else {
                let totalCorrect = 0;
                Object.keys(categoryMap).forEach(cat => {
                    const greenHeight = parseFloat(document.querySelector(categoryMap[cat].correctBar).style.height || 0);
                    totalCorrect += greenHeight;
                });
                const percentage = Math.round((totalCorrect / 300) * 100); // 300 = 100% * 3 categorías
                endMessage.textContent = `Lograste clasificar el ${percentage}% de los residuos.`;
                percentageElement.textContent = percentage;
            }
        } else {
            console.error("Uno o más elementos del modal no encontrados en el DOM");
        }
        endModal.show();
        clearInterval(spawnInterval); // Detiene el spawn de residuos
    }

    // Inicia spawn cada 2.7s
    spawnInterval = setInterval(spawnWaste, 2000);

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
        activeWastes.forEach((wasteObj, index) => {
            const waste = wasteObj.element;
            const wasteRect = waste.getBoundingClientRect();
            const canRect = stickyCan.getBoundingClientRect();
            const wasteCategory = waste.dataset.category;
            if (checkCollision(canRect, wasteRect)) {
                const activeCategory = getActiveCanCategory();
                const increment = 10;
                if (activeCategory === wasteCategory) {
                    updateBar(categoryMap[wasteCategory].correctBar, increment, 'correct');
                    successSound.play().catch(e => console.log('Audio play failed:', e));
                    showEmojiFeedback('✅', 'correct');
                } else {
                    updateBar(categoryMap[wasteCategory].wrongBar, increment, 'wrong');
                    wrongSound.play().catch(e => console.log('Audio play failed:', e));
                    showEmojiFeedback('❌', 'wrong');
                }
                waste.remove();
                activeWastes.splice(index, 1);
            } else if (wasteRect.bottom > gameView.clientHeight) { // Residuos que pasan de largo
                waste.remove();
                activeWastes.splice(index, 1);
                missedResidues++;
                updateFillLevel();
                if (missedResidues == maxMissed){
                    showWarningPopup("¡No más residuos en el suelo!"); // Nuevo pop-up
                } else if (missedResidues > maxMissed && !endModal._isShown) {
                    showEndModal("¡Fin del juego! Demasiados residuos en el suelo.");
                }
            }
            // Nueva función para el pop-up
            function showWarningPopup(message) {
                const popup = document.createElement('div');
                popup.className = 'warning-popup';
                popup.textContent = message;
                const gameRect = gameView.getBoundingClientRect();
                popup.style.left = `${gameRect.width / 2 - 100}px`; // Centrado horizontalmente (ajusta 100 según el ancho del texto)
                popup.style.top = `${gameRect.height / 2 - 20}px`; // Centrado verticalmente (ajusta 20 según la altura)
                gameView.appendChild(popup);
                setTimeout(() => {
                    popup.style.opacity = '0';
                    setTimeout(() => {
                        if (popup.parentNode) popup.remove();
                    }, 500); // Tiempo para la transición de desaparición
                }, 1500); // Duración visible: 1.5 segundos
            }
        });
        requestAnimationFrame(loop);
    }

    // Input events
    window.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") keys.left = true;
        if (e.key === "ArrowRight") keys.right = true;

        const buttons = document.querySelectorAll(".cans .button");

        if (e.key === "1") {
            activeCan.src = "/images/green-trash-bin.png";
            buttons.forEach(btn => btn.classList.remove("selected"));
            document.querySelector(".caneca-organic .button").classList.add("selected");
        }
        if (e.key === "2") {
            activeCan.src = "/images/white-trash-bin.png";
            buttons.forEach(btn => btn.classList.remove("selected"));
            document.querySelector(".caneca-reciclables .button").classList.add("selected");
        }
        if (e.key === "3") {
            activeCan.src = "/images/black-trash-bin.png";
            buttons.forEach(btn => btn.classList.remove("selected"));
            document.querySelector(".caneca-no-reciclables .button").classList.add("selected");
        }

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
        const maxX = Math.max(0, worldWidth - player.offsetWidth + 200);
        if (playerX > maxX) playerX = maxX;
        player.style.left = `${playerX}px`;
        updateStickyPosition(true);
    });

    requestAnimationFrame(loop);
});