import { PLAYER_NAMES, PLAYER_COLORS } from '../utils/constants';
import { getPlayerIds } from '../utils/gameLogic';
import './StartScreen.css';

export default function StartScreen({
    playerCount,
    cpuPlayers,
    onPlayerCountChange,
    onToggleCpu,
    onStart,
}) {
    const activePlayerIds = getPlayerIds(playerCount);

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
                </div>

                {/* Player Type Selection */}
                <div className="player-type-section">
                    <h2 className="setup-title">Choose player types</h2>
                    <div className="player-type-grid">
                        {activePlayerIds.map((playerId) => {
                            const isCpu = !!cpuPlayers[playerId];
                            const colors = PLAYER_COLORS[playerId];
                            return (
                                <div
                                    key={playerId}
                                    className="player-type-card"
                                    style={{ '--card-color': colors.main, '--card-glow': colors.glow }}
                                >
                                    <div className="ptc-header">
                                        <span
                                            className="ptc-dot"
                                            style={{ background: colors.main }}
                                        />
                                        <span className="ptc-name">{PLAYER_NAMES[playerId]}</span>
                                    </div>
                                    <button
                                        className={`type-toggle ${isCpu ? 'cpu' : 'human'}`}
                                        onClick={() => onToggleCpu(playerId)}
                                        id={`toggle-cpu-${playerId}`}
                                        title={isCpu ? 'Switch to Human' : 'Switch to Computer'}
                                    >
                                        <span className="toggle-icon">{isCpu ? '🤖' : '👤'}</span>
                                        <span className="toggle-label">{isCpu ? 'CPU' : 'Human'}</span>
                                    </button>
                                </div>
                            );
                        })}
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
