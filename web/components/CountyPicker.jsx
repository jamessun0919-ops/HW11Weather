"use client";

import { useRouter } from "next/navigation";

export default function CountyPicker({ counties }) {
  const router = useRouter();

  return (
    <div className="picker">
      <select
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) router.push(`/select/${encodeURIComponent(e.target.value)}`);
        }}
      >
        <option value="">選擇其他縣市…</option>
        {counties.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}
