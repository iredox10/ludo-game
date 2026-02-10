import { useState, useEffect, useMemo } from 'react';
import './Dice.css';

// Dot positions for each face value (percentage-based)
const dotPositions = {
    1: [[50, 50]],
    2: [[28, 28], [72, 72]],
    3: [[28, 28], [50, 50], [72, 72]],
    4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[28, 22], [72, 22], [28, 50], [72, 50], [28, 78], [72, 78]],
};

// Map dice value to the CSS transform that shows that face
const faceRotations = {
    1: 'rotateX(0deg) rotateY(0deg)',       // front
    2: 'rotateY(-90deg)',                    // right
    3: 'rotateX(90deg)',                     // top → face 3
    4: 'rotateX(-90deg)',                    // bottom → face 4
    5: 'rotateY(90deg)',                     // left → face 5
    6: 'rotateX(180deg) rotateY(0deg)',      // back → face 6
};

function DiceFace({ value, className }) {
    const dots = dotPositions[value] || dotPositions[1];
    return (
        <div className={`dice-face ${className}`}>
            {dots.map(([x, y], i) => (
                <div
                    key={i}
                    className="dice-dot"
                    style={{ left: `${x}%`, top: `${y}%` }}
                />
            ))}
        </div>
    );
}

export default function Dice({ value, rolling, onRoll, disabled, playerColor }) {
    const [phase, setPhase] = useState('idle'); // 'idle' | 'spinning' | 'landing'
    const [spinDeg, setSpinDeg] = useState({ x: 0, y: 0, z: 0 });
    const [lastValue, setLastValue] = useState(1); // Remember the last face shown

    useEffect(() => {
        if (rolling) {
            setPhase('spinning');
            // Generate a wild random spin
            setSpinDeg({
                x: 720 + Math.random() * 360,
                y: 720 + Math.random() * 360,
                z: 360 + Math.random() * 180,
            });
        } else if (value && phase === 'spinning') {
            // Spin just ended → land on the new value
            setLastValue(value);
            setPhase('landing');
            const timer = setTimeout(() => setPhase('idle'), 400);
            return () => clearTimeout(timer);
        } else if (value) {
            // Value set without spinning (e.g. on load)
            setLastValue(value);
        }
    }, [rolling, value]);

    // The face to display — use lastValue to avoid flashing face 1
    const displayValue = value || lastValue;

    // Compute cube style (transform + transition)
    const cubeStyle = useMemo(() => {
        if (phase === 'spinning') {
            return {
                transform: `rotateX(${spinDeg.x}deg) rotateY(${spinDeg.y}deg) rotateZ(${spinDeg.z}deg)`,
                transition: 'transform 0.8s cubic-bezier(0.2, 0.8, 0.3, 1)',
            };
        }
        return {
            transform: faceRotations[displayValue] || faceRotations[1],
            transition: 'none',  // Snap instantly — no flash through face 1
        };
    }, [phase, spinDeg, displayValue]);

    return (
        <div className="dice-wrapper">
            <button
                className={`dice-button ${rolling ? 'rolling' : ''} ${disabled ? 'disabled' : ''}`}
                onClick={!disabled && !rolling ? onRoll : undefined}
                style={{ '--dice-accent': playerColor || '#E53935' }}
                disabled={disabled || rolling}
                id="roll-dice-btn"
            >
                <div className="dice-scene">
                    <div
                        className={`dice-cube ${phase === 'landing' ? 'landed' : ''}`}
                        style={cubeStyle}
                    >
                        {/* Face 1 - Front */}
                        <DiceFace value={1} className="face-front" />
                        {/* Face 6 - Back */}
                        <DiceFace value={6} className="face-back" />
                        {/* Face 2 - Right */}
                        <DiceFace value={2} className="face-right" />
                        {/* Face 5 - Left */}
                        <DiceFace value={5} className="face-left" />
                        {/* Face 3 - Top */}
                        <DiceFace value={3} className="face-top" />
                        {/* Face 4 - Bottom */}
                        <DiceFace value={4} className="face-bottom" />
                    </div>
                </div>
            </button>

            {!disabled && !rolling && !value && (
                <span className="dice-hint">Tap to roll</span>
            )}
        </div>
    );
}
