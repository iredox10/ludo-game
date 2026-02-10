import { useEffect, useRef } from 'react';
import { PLAYER_NAMES, PLAYER_COLORS } from '../utils/constants';
import './WinnerModal.css';

export default function WinnerModal({ winner, onPlayAgain }) {
    const modalRef = useRef(null);

    useEffect(() => {
        if (winner !== null && winner !== undefined) {
            createConfetti();
        }
    }, [winner]);

    function createConfetti() {
        const container = modalRef.current?.querySelector('.confetti-area');
        if (!container) return;

        container.innerHTML = '';
        const colors = ['#E53935', '#43A047', '#FDD835', '#1E88E5', '#FF6F60', '#76D275', '#6AB7FF', '#FFFF6B'];

        for (let i = 0; i < 60; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 2 + 's';
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            confetti.style.width = (Math.random() * 8 + 4) + 'px';
            confetti.style.height = (Math.random() * 8 + 4) + 'px';
            container.appendChild(confetti);
        }
    }

    if (winner === null || winner === undefined) return null;

    const colors = PLAYER_COLORS[winner];

    return (
        <div className="winner-overlay" ref={modalRef}>
            <div className="confetti-area" />
            <div className="winner-modal">
                <div
                    className="winner-glow"
                    style={{ background: colors.glow }}
                />
                <div className="winner-content">
                    <div className="trophy">🏆</div>
                    <h2 className="winner-heading">Congratulations!</h2>
                    <p
                        className="winner-name"
                        style={{ color: colors.main }}
                    >
                        {PLAYER_NAMES[winner]} Wins!
                    </p>
                    <p className="winner-sub">All 4 tokens reached home!</p>

                    <button
                        className="play-again-btn"
                        onClick={onPlayAgain}
                        id="play-again-btn"
                        style={{
                            background: `linear-gradient(135deg, ${colors.main}, ${colors.light})`,
                        }}
                    >
                        Play Again
                    </button>
                </div>
            </div>
        </div>
    );
}
