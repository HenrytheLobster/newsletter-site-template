import {
  MARKETS,
  MARKET_IDS,
  getMarket as catalogGetMarket,
  getMarketId as catalogGetMarketId,
  siteUrl,
  kitSrc,
  guidesIndexPath,
  guidePath,
  foreignIdentifiers,
} from "../config/markets.js";
import { readGeneratedMarket } from "./project.js";

/**
 * Current market. A site build writes src/generated/market.json from its
 * own src/config/market.js; the template preview falls back to the catalog
 * selected by MARKET=.
 */
export function getMarket(id) {
  const generated = readGeneratedMarket();
  const requested = id || process.env.MARKET;
  if (generated?.id && (!requested || requested === generated.id)) {
    return generated;
  }
  return catalogGetMarket(id);
}

export function getMarketId() {
  const generated = readGeneratedMarket();
  if (generated?.id && (!process.env.MARKET || process.env.MARKET === generated.id)) {
    return generated.id;
  }
  return catalogGetMarketId();
}

export {
  MARKETS,
  MARKET_IDS,
  siteUrl,
  kitSrc,
  guidesIndexPath,
  guidePath,
  foreignIdentifiers,
};
