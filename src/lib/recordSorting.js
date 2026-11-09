export function sortRecordsNewestFirst(records = [], dateFields = ["created_at"]) {
  const timestampFor = (record) => {
    for (const field of dateFields) {
      const timestamp = Date.parse(record?.[field]);
      if (Number.isFinite(timestamp)) return timestamp;
    }
    return 0;
  };

  return [...records].sort((a, b) => {
    const dateDifference = timestampFor(b) - timestampFor(a);
    if (dateDifference !== 0) return dateDifference;
    const idA = String(a?.id ?? "");
    const idB = String(b?.id ?? "");
    if (idA === idB) return 0;
    return idA < idB ? 1 : -1;
  });
}