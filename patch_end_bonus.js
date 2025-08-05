// Patch endBonusRound only once, after all function declarations, if not already patched
if (typeof endBonusRound === 'function' && !window._patchedEndBonusRound) {
    let origEndBonus = endBonusRound;
    endBonusRound = function() {
        window.bonusJustEnded = true;
        setTimeout(() => { window.bonusJustEnded = false; }, 2000);
        origEndBonus();
    }
    window._patchedEndBonusRound = true;
}
