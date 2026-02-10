import './StartScreen.css';

export default function StartScreen({ playerCount, onPlayerCountChange, onStart }) {
    return (
        <div className="start-screen">
            <div className="start-bg-effects">
                <div className="bg-orb orb-1" />
                <div className="bg-orb orb-2" />
                <div className="bg-orb orb-3" />
                <div className="bg-orb orb-4" />
            </div>

            <div className="start-container">
                <div className="logo-section">
                    <div className="logo-tokens">
                        <div className="logo-token red" />
                        <div className="logo-token green" />
                        <div className="logo-token yellow" />
                        <div className="logo-token blue" />
                    </div>
                    <h1 className="game-title">LUDO</h1>
                    <p className="game-tagline">The Classic Board Game</p>
                </div>

                <div className="setup-section">
                    <h2 className="setup-title">How many players?</h2>
                    <div className="player-buttons">
                        {[2, 3, 4].map((count) => (
                            <button
                                key={count}
                                className={`player-count-btn ${playerCount === count ? 'active' : ''}`}
                                onClick={() => onPlayerCountChange(count)}
                                id={`btn-${count}-players`}
                            >
                                <span className="count-number">{count}</span>
                                <span className="count-label">Players</span>
                            </button>
                        ))}
                    </div>

                    <div className="player-preview">
                        {playerCount >= 1 && <span className="preview-dot red" title="Red" />}
                        {playerCount >= 3 && <span className="preview-dot green" title="Green" />}
                        {playerCount >= 2 && <span className="preview-dot yellow" title="Yellow" />}
                        {playerCount >= 4 && <span className="preview-dot blue" title="Blue" />}
                    </div>
                </div>

                <button className="play-btn" onClick={onStart} id="start-game-btn">
                    <span className="play-text">Start Game</span>
                    <span className="play-icon">▶</span>
                </button>

                <div className="rules-hint">
                    <p>🎲 Roll a 6 to bring a token out</p>
                    <p>⭐ Stars are safe zones</p>
                    <p>🏠 Get all 4 tokens home to win!</p>
                </div>
            </div>
        </div>
    );
}
