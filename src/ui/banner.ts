import gradient from "gradient-string";
import { gradientColors } from "./theme.js";

const bannerGradient = gradient([...gradientColors.banner]);

// TODO: Replace with hardcoded ASCII art
const BANNER = `
  __   __ ___  ___  ___  _  _
  \\ \\ / /|_ _|/ __||   \\| \\| |
   \\ V /  | || (__ | |) | .\` |
    \\_/  |___|\\___||___/|_|\\_|
`;

/**
 * Display the ASCII art banner with gradient colors
 */
export function showBanner(): void {
	console.log(bannerGradient(BANNER));
}
