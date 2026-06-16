// Catálogo de Emojis locales estables para evitar llamadas CORS de red local
const ICON_POOL = ['🍎', '🍌', '🍇', '🍉', '🍒', '🍓', '🍍', '🥝', '🍋', '🍊', '🥑', '🥥'];

class MemoryEngine {
    constructor() {
        // Inicialización del Estado de la Aplicación (Fuente Única de Verdad)
        this.state = {
            difficulty: 8,
            cards: [],
            selectedIndices: [],
            moves: 0,
            combo: 1,
            maxCombo: 1,
            matchedPairs: 0,
            isBoardLocked: false
        };

        // Cacheado del DOM para acelerar búsquedas de elementos
        this.dom = {
            board: document.getElementById('game-board'),
            moves: document.getElementById('moves-counter'),
            combo: document.getElementById('combo-counter'),
            bestScore: document.getElementById('best-score'),
            difficulty: document.getElementById('difficulty'),
            resetBtn: document.getElementById('reset-btn'),
            modal: document.getElementById('victory-screen'),
            finalMoves: document.getElementById('final-moves'),
            finalCombo: document.getElementById('final-combo'),
            playAgainBtn: document.getElementById('play-again-btn')
        };

        this.initEvents();
        this.startSession();
    }

    initEvents() {
        // Asignación de delegación de eventos optimizada en el contenedor del tablero
        this.dom.board.addEventListener('click', (e) => this.handleCardClick(e));
        
        // Evento 'change' para reconfigurar el tamaño de la matriz
        this.dom.difficulty.addEventListener('change', (e) => {
            this.state.difficulty = parseInt(e.target.value);
            this.startSession();
        });

        // Eventos de click para reiniciar las partidas
        this.dom.resetBtn.addEventListener('click', () => this.startSession());
        this.dom.playAgainBtn.addEventListener('click', () => {
            this.dom.modal.classList.add('hidden');
            this.startSession();
        });

        // Evento 'keydown' global (Accesibilidad de Usuario Avanzado: Tecla R)
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'r') {
                this.dom.modal.classList.add('hidden');
                this.startSession();
            }
        });
    }

    startSession() {
        // Reinicio completo del estado transicional
        this.state.moves = 0;
        this.state.combo = 1;
        this.state.maxCombo = 1;
        this.state.matchedPairs = 0;
        this.state.selectedIndices = [];
        this.state.isBoardLocked = false;

        this.updateUiMetrics();
        this.loadBestScore();

        // Extracción de subconjunto de datos balanceado según la dificultad elegida
        const activeIcons = ICON_POOL.slice(0, this.state.difficulty);
        const doubleSet = [...activeIcons, ...activeIcons];
        
        // Barajado aleatorio matemático utilizando Fisher-Yates
        this.state.cards = this.shuffle(doubleSet).map((iconName, index) => ({
            id: index,
            icon: iconName,
            isFlipped: false,
            isMatched: false
        }));

        this.renderDomBoard();
    }

    shuffle(array) {
        let m = array.length, t, i;
        while (m) {
            i = Math.floor(Math.random() * m--);
            t = array[m];
            array[m] = array[i];
            array[i] = t;
        }
        return array;
    }

    renderDomBoard() {
        // Vaciado veloz del contenedor
        this.dom.board.innerHTML = '';
        
        // Configuración adaptativa de las columnas del Grid según cantidad de cartas
        const totalCards = this.state.cards.length;
        let cols = 4;
        if (totalCards > 16) cols = 6;
        if (totalCards <= 8) cols = 4;

        this.dom.board.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;

        // Optimización de rendimiento: Uso de DocumentFragment para prevenir reflows del DOM
        const fragment = document.createDocumentFragment();
        
        this.state.cards.forEach(card => {
            // Generación de elementos semánticos button legibles por lectores de pantalla
            const cardEl = document.createElement('button');
            cardEl.className = 'card';
            cardEl.setAttribute('data-id', card.id);
            cardEl.setAttribute('aria-label', `Carta oculta posicional número ${card.id + 1}`);

            cardEl.innerHTML = `
                <span class="card-face card-back"></span>
                <span class="card-face card-front" style="font-size: 2rem;">
                    ${card.icon}
                </span>
            `;
            fragment.appendChild(cardEl);
        });

        this.dom.board.appendChild(fragment);
    }

    handleCardClick(e) {
        // Encontrar el botón de la carta más cercano al click real realizado
        const clickedCardDom = e.target.closest('.card');
        if (!clickedCardDom || this.state.isBoardLocked) return;

        const cardId = parseInt(clickedCardDom.getAttribute('data-id'));
        const cardData = this.state.cards[cardId];

        // Clausuras de guardia críticas contra inyecciones fraudulentas de eventos
        if (cardData.isFlipped || cardData.isMatched) return;

        // Actualización de estado síncrona
        clickedCardDom.classList.add('flipped');
        cardData.isFlipped = true;
        this.state.selectedIndices.push(cardId);

        if (this.state.selectedIndices.length === 2) {
            this.state.moves++;
            this.processTurn();
        }
    }

    processTurn() {
        // BLOQUEO CENTRAL ASÍNCRONO INSTANTÁNEO
        this.state.isBoardLocked = true;
        
        const [id1, id2] = this.state.selectedIndices;
        const card1 = this.state.cards[id1];
        const card2 = this.state.cards[id2];

        const card1Dom = this.dom.board.children[id1];
        const card2Dom = this.dom.board.children[id2];

        // Comparación directa de lógica pura desde memoria de datos
        if (card1.icon === card2.icon) {
            // Flujo de Coincidencia Exitosa
            card1.isMatched = card2.isMatched = true;
            
            card1Dom.classList.replace('flipped', 'matched');
            card2Dom.classList.replace('flipped', 'matched');

            this.state.matchedPairs++;
            
            // Multiplicador de rachas competitivo
            if (this.state.moves > 1) {
                this.state.combo++;
                if (this.state.combo > this.state.maxCombo) this.state.maxCombo = this.state.combo;
            }

            this.state.selectedIndices = [];
            this.state.isBoardLocked = false; // Desbloqueo rápido por acierto

            this.updateUiMetrics();

            if (this.state.matchedPairs === this.state.difficulty) {
                this.triggerVictory();
            }
        } else {
            // Flujo de Error
            this.state.combo = 1; // Ruptura del combo
            this.updateUiMetrics();

            // Sincronización del temporizador con el tiempo de animación visual de las cartas
            setTimeout(() => {
                card1Dom.classList.remove('flipped');
                card2Dom.classList.remove('flipped');
                
                card1.isFlipped = card2.isFlipped = false;
                
                this.state.selectedIndices = [];
                this.state.isBoardLocked = false; // LIBERACIÓN FORMAL DEL TABLERO
            }, 900);
        }
    }

    updateUiMetrics() {
        this.dom.moves.textContent = String(this.state.moves).padStart(2, '0');
        this.dom.combo.textContent = `x${this.state.combo}`;
        
        // Estilización dinámica según el valor del combo
        if (this.state.combo > 2) {
            this.dom.combo.style.color = 'var(--accent-neon)';
            this.dom.combo.style.textShadow = '0 0 10px var(--accent-neon)';
        } else {
            this.dom.combo.style.color = 'var(--text-main)';
            this.dom.combo.style.textShadow = 'none';
        }
    }

    triggerVictory() {
        this.saveBestScore();
        
        setTimeout(() => {
            this.dom.finalMoves.textContent = this.state.moves;
            this.dom.finalCombo.textContent = `x${this.state.maxCombo}`;
            this.dom.modal.classList.remove('hidden');
        }, 600);
    }

    saveBestScore() {
        const storageKey = `neon_match_best_diff_${this.state.difficulty}`;
        const currentBest = localStorage.getItem(storageKey);

        if (!currentBest || this.state.moves < parseInt(currentBest)) {
            localStorage.setItem(storageKey, this.state.moves);
        }
        this.loadBestScore();
    }

    loadBestScore() {
        const storageKey = `neon_match_best_diff_${this.state.difficulty}`;
        const best = localStorage.getItem(storageKey);
        this.dom.bestScore.textContent = best ? String(best).padStart(2, '0') : '--';
    }
}

// Arranque ordenado al estar el DOM completamente parseado por el motor gráfico
document.addEventListener('DOMContentLoaded', () => {
    window.MemoryGameInstance = new MemoryEngine();
});