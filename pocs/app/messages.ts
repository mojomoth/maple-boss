// Copy more than one screen shows, so one condition reads the same everywhere.

// fetch() rejects with a TypeError ("Failed to fetch") when the server cannot be reached.
const OFFLINE = "서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.";

// The local crawler at work. One line at 375px, so the main screen's reserved message line holds it.
export const CRAWLING = "불러오는 중(최대 3분). 새 창에서 ‘사람인지 확인’을 눌러요.";

// A caught fetch failure as a message to show: never the browser's English text.
export const errorText = (err: unknown) => (err instanceof TypeError ? OFFLINE : err instanceof Error ? err.message : String(err));
