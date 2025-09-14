// public/app.js
document.addEventListener("DOMContentLoaded", () => {
    const player = document.querySelector(".player");
    const playerImg = player.querySelector("img");
    const gameView = document.querySelector(".game_view");
    const stickyCan = document.querySelector(".sticky_can");
    const activeCan = document.getElementById("active-can");

    // POSICIÓN INICIAL DEL JUGADOR (centro)
    let playerX = (gameView.clientWidth - player.offsetWidth) / 2;
    player.style.left = `${playerX}px`;

    // INPUT / VELOCIDAD
    const keys = { left: false, right: false };
    const moveSpeed = 6; // px por frame, ajustar según preferencia

    // FACING y offsets (ajustables)
    let facing = "right";          // 'right' o 'left'
    const offsets = { left: -45, right: 36 }; // valores a tunear para tu sprite

    // Función de utilidad (lerp) para suavizar
    function lerp(a, b, t) { return a + (b - a) * t; }

    // Actualiza la posición absoluta del sticky_can para que esté "al frente" del jugador
    function updateStickyPosition(immediate = false) {
        const playerRect = player.getBoundingClientRect();
        const gameRect = gameView.getBoundingClientRect();

        // Centro x del jugador relativo al contenedor gameView
        const playerCenterX = (playerRect.left - gameRect.left) + playerRect.width / 2;

        // target X para que el centro de la caneca quede en playerCenterX + offset
        const offset = (facing === "right") ? offsets.right : offsets.left;
        const targetX = playerCenterX + offset - (stickyCan.offsetWidth / 2);

        // Si no hay valor previo, inicializamos
        const currentLeft = parseFloat(stickyCan.style.left) || targetX;

        // Suavizado: si immediate true, saltar interpolation
        const smooth = immediate ? 1 : 0.25; // 0.25 => sigue rápido pero suave
        const newLeft = lerp(currentLeft, targetX, smooth);

        // Asignar
        stickyCan.style.left = `${newLeft}px`;

        // sincronizar flip de la imagen de la caneca con el facing
        activeCan.style.transform = (facing === "left") ? "scaleX(-1)" : "scaleX(1)";
    }

    // Loop principal (actualiza jugador y caneca)
    function loop() {
        // actualizar playerX según input
        if (keys.left && !keys.right) {
            playerX -= moveSpeed;
            facing = "left";
            player.classList.add("flipped");
        } else if (keys.right && !keys.left) {
            playerX += moveSpeed;
            facing = "right";
            player.classList.remove("flipped");
        }

        // limitar dentro del gameView
        const maxX = Math.max(0, gameView.clientWidth - player.offsetWidth);
        if (playerX < 0) playerX = 0;
        if (playerX > maxX) playerX = maxX;

        // aplicar posición del jugador
        player.style.left = `${playerX}px`;

        // actualizar la posición de la caneca (suave)
        updateStickyPosition();

        requestAnimationFrame(loop);
    }

    // Input events (soportando mantener pulsada tecla)
    window.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") keys.left = true;
        if (e.key === "ArrowRight") keys.right = true;

        // cambio de caneca rápido (1,2,3)
        if (e.key === "1") activeCan.src = "/images/green-trash-bin.png";
        if (e.key === "2") activeCan.src = "/images/white-trash-bin.png";
        if (e.key === "3") activeCan.src = "/images/black-trash-bin.png";

        //Cambio de jugador
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

    // Forzar posicionamiento inicial de la caneca (sin suavizado)
    // (espera un tick para asegurarse que offsetWidth esté disponible)
    setTimeout(() => updateStickyPosition(true), 50);

    // reajustar al redimensionar ventana
    window.addEventListener("resize", () => {
        // mantener jugador dentro de limites
        const maxX = Math.max(0, gameView.clientWidth - player.offsetWidth);
        if (playerX > maxX) playerX = maxX;
        player.style.left = `${playerX}px`;

        // reposicionar caneca inmediatamente
        updateStickyPosition(true);
    });

    // iniciar loop
    requestAnimationFrame(loop);
});
