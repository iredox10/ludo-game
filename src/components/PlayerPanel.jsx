import { PLAYER_COLORS, PLAYER_NAMES, TOKEN_STATE } from '../utils/constants';
import './PlayerPanel.css';

export default function PlayerPanel({ players, tokens, currentPlayer }) {
    return (
        <div className="player-panel">
            {players.map((playerId) => {
                const colors = PLAYER_COLORS[playerId];
                const playerTokens = tokens[playerId] || [];
                const isActive = playerId === currentPlayer;
                const finishedCount = playerTokens.filter((t) => t.state === TOKEN_STATE.FINISHED).length;
                const activeCount = playerTokens.filter((t) => t.state === TOKEN_STATE.ACTIVE).length;
                const homeCount = playerTokens.filter((t) => t.state === TOKEN_STATE.HOME).length;

                return (
                    <div
                        key={playerId}
                        className={`player-card ${isActive ? 'active' : ''}`}
                        style={{
                            '--player-color': colors.main,
                            '--player-light': colors.light,
                            '--player-dark': colors.dark,
                            '--player-bg': colors.bg,
                            '--player-glow': colors.glow,
                        }}
                        id={`player-card-${playerId}`}
                    >
                        <div className="player-card-header">
                            <div className="player-dot" />
                            <span className="player-name">{PLAYER_NAMES[playerId]}</span>
                            {isActive && <span className="turn-badge">Playing</span>}
                        </div>
                        <div className="token-status">
                            {playerTokens.map((token, i) => (
                                <div
                                    key={i}
                                    className={`token-indicator ${token.state}`}
                                    title={`Token ${i + 1}: ${token.state}`}
                                />
                            ))}
                        </div>
                        <div className="player-score">
                            <span className="score-item">
                                <span className="score-icon">🏠</span>
                                <span>{homeCount}</span>
                            </span>
                            <span className="score-item">
                                <span className="score-icon">🎯</span>
                                <span>{activeCount}</span>
                            </span>
                            <span className="score-item">
                                <span className="score-icon">✅</span>
                                <span>{finishedCount}</span>
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
