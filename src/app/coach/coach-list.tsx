"use client";

import { useState } from "react";
import Link from "next/link";

interface Student {
  id: string;
  display_name: string;
  email: string;
  created_at: string;
  coach_id: string | null;
}

interface Coach {
  id: string;
  display_name: string;
  email: string;
  created_at: string;
}

export default function CoachList({
  students,
  coachList,
  coachMap,
  countMap,
  reportedToday,
  isMaster,
}: {
  students: Student[];
  coachList: Coach[];
  coachMap: Record<string, string>;
  countMap: Record<string, number>;
  reportedToday: string[];
  isMaster: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const reportedSet = new Set(reportedToday);

  const q = searchQuery.toLowerCase().trim();

  const filteredCoaches = coachList.filter((c) => {
    if (!q) return true;
    return (
      (c.display_name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    );
  });

  const filteredStudents = students.filter((s) => {
    if (!q) return true;
    return (
      (s.display_name || "").toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜尋姓名或 Email..."
          className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm placeholder:text-muted-foreground"
        />
      </div>

      {/* Coach List (master only) */}
      {isMaster && filteredCoaches.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">教練列表</h2>
          <div className="space-y-3">
            {filteredCoaches.map((coach) => {
              const assignedCount = students.filter((s) => s.coach_id === coach.id).length;
              return (
                <Link
                  key={coach.id}
                  href={`/coach/students/${coach.id}`}
                  className="flex items-center justify-between p-4 rounded-xl border border-gold/30 bg-card card-hover"
                >
                  <div>
                    <p className="font-semibold text-gold">{coach.display_name || "未設定名稱"}</p>
                    <p className="text-sm text-muted-foreground">{coach.email}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <p className="text-muted-foreground">指派學員</p>
                      <p className="font-semibold text-gold">{assignedCount}</p>
                    </div>
                    <span className="text-muted-foreground ml-2">&rarr;</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Student List */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">學員列表</h2>
        <Link href="/coach/notes" className="text-sm text-gold hover:underline">
          查看所有筆記
        </Link>
      </div>

      {filteredStudents.length === 0 ? (
        <div className="p-8 rounded-xl border border-border bg-card text-center">
          <p className="text-muted-foreground">
            {q ? "找不到符合的學員" : "目前沒有指派的學員"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredStudents.map((student) => (
            <Link
              key={student.id}
              href={`/coach/students/${student.id}`}
              className="flex items-center justify-between p-4 rounded-xl border border-border bg-card card-hover"
            >
              <div>
                <p className="font-semibold">{student.display_name || "未設定名稱"}</p>
                <p className="text-sm text-muted-foreground">
                  {student.email}
                  {isMaster && student.coach_id && coachMap[student.coach_id] && (
                    <span className="ml-2 text-gold/70">（教練：{coachMap[student.coach_id]}）</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-right">
                  <p className="text-muted-foreground">累計天數</p>
                  <p className="font-semibold text-gold">{countMap[student.id] || 0}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">今日</p>
                  <p className={`font-semibold ${reportedSet.has(student.id) ? "text-green-400" : "text-yellow-400"}`}>
                    {reportedSet.has(student.id) ? "已填" : "未填"}
                  </p>
                </div>
                <span className="text-muted-foreground ml-2">&rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
