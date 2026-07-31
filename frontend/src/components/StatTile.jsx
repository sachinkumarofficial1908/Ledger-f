import React from "react";
import { Icon } from "./Icon.jsx";
import { AnimatedMoney } from "./AnimatedMoney.jsx";

/**
 * goodDirection: "up" | "down" — which direction of deltaPct counts as good
 * for this metric (e.g. rising income is good, rising expenses is not).
 */
export function StatTile({ icon, label, value, isCurrency = true, deltaPct, goodDirection = "up" }) {
  const hasDelta = typeof deltaPct === "number" && Number.isFinite(deltaPct);
  const direction = deltaPct > 0 ? "up" : deltaPct < 0 ? "down" : null;
  const isGood = direction === goodDirection;

  return (
    <div className="statTile">
      <div className="statTile__top">
        <span className="statTile__icon">
          <Icon name={icon} size={17} />
        </span>
        {hasDelta && direction && (
          <span className={`statTile__delta ${isGood ? "statTile__delta--good" : "statTile__delta--bad"}`}>
            <Icon name={direction === "up" ? "arrowUp" : "arrowDown"} size={11} />
            {Math.abs(deltaPct).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="statTile__label">{label}</div>
      <div className="statTile__value">
        {isCurrency ? <AnimatedMoney value={value || 0} /> : `${(value || 0).toFixed(1)}%`}
      </div>
    </div>
  );
}
