import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { getInitials, getMerchantColor } from '../utils/formatters';

export default function Topbar({
    currentMerchant,
    merchants,
    onSelectMerchant
}) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const avatarBg = getMerchantColor(currentMerchant);
    const initials = getInitials(currentMerchant);

    return (
        <header className="topbar">
            <div className="topbar-left">
                <h1>GrowthPilot AI</h1>
                <p>From Insights to Intelligent Action</p>
            </div>

            <div className="merchant-selector" ref={dropdownRef}>
                <button
                    className="merchant-selector-btn"
                    id="merchantSelectorBtn"
                    onClick={() => setDropdownOpen(prev => !prev)}
                    type="button"
                    aria-expanded={dropdownOpen}
                >
                    <div className="merchant-avatar" id="merchantAvatar" style={{ background: avatarBg }}>
                        {initials}
                    </div>
                    <div className="merchant-info">
                        <strong id="merchantName">{currentMerchant}</strong>
                        <span>Business Owner</span>
                    </div>
                    <ChevronDown size={15} />
                </button>

                {dropdownOpen && (
                    <div className="merchant-dropdown open" id="merchantDropdown">
                        {merchants.map(name => {
                            const isCurrent = name === currentMerchant;
                            const mBg = getMerchantColor(name);
                            return (
                                <button
                                    key={name}
                                    className={`merchant-dropdown-item ${isCurrent ? 'active' : ''}`}
                                    onClick={() => {
                                        onSelectMerchant(name);
                                        setDropdownOpen(false);
                                    }}
                                    type="button"
                                >
                                    <div className="merchant-avatar" style={{ background: mBg }}>
                                        {getInitials(name)}
                                    </div>
                                    {name}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </header>
    );
}
