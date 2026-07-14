// 提出期限をソート用の数値へ変換する。期限なし（null）は 0 とし先頭に並ぶ。
export function dueTime(due: string | null): number {
  return due ? new Date(due).getTime() : 0;
}
