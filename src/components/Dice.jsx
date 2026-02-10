import { useState, useEffect } from 'react';
import './Dice.css';

const dotPositions = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
};

export default function Dice({ value, rolling, onRoll, disabled, playerColor }) {
    const [displayValue, setDisplayValue] = useState(1);
    const [animValues, setAnimValues] = useState([]);

    useEffect(() => {
        if (rolling) {
            // Show random values during animation
            const interval = setInterval(() => {
                setDisplayValue(Math.floor(Math.random() * 6) + 1);
            }, 80);

            return () => clearInterval(interval);
        } else if (value) {
            setDisplayValue(value);
        }
    }, [rolling, value]);

    const dots = dotPositions[displayValue] || dotPositions[1];

    return (
        <div className="dice-wrapper">
            <button
                className={`dice-button ${rolling ? 'rolling' : ''} ${disabled ? 'disabled' : ''}`}
                onClick={!disabled && !rolling ? onRoll : undefined}
                style={{
                    '--dice-accent': playerColor || '#E53935',
                }}
                disabled={disabled || rolling}
                id="roll-dice-btn"
            >
                <div className={`dice-cube ${rolling ? 'spinning' : value ? 'landed' : ''}`}>
                    <div className="dice-face">
                        {dots.map(([x, y], i) => (
                            <div
                                key={i}
                                className="dice-dot"
                                style={{
                                    left: `${x}%`,
                                    top: `${y}%`,
                                }}
                            />
                        ))}
                    </div>
                </div>
            </button>

            {!disabled && !rolling && !value && (
                <span className="dice-hint">Tap to roll</span>
            )}
        </div>
    );
}
