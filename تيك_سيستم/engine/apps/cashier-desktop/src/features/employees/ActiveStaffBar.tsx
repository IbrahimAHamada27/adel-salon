import React from 'react';
import { LocalEmployee } from '../../types/employee';
import { UserCheck, Users } from 'lucide-react';

interface ActiveStaffBarProps {
  employees: LocalEmployee[];
  onSelectEmployee?: (emp: LocalEmployee) => void;
}

export const ActiveStaffBar: React.FC<ActiveStaffBarProps> = ({ employees }) => {
  return (
    <div className="bg-slate-950/90 border-t border-slate-800/80 px-5 py-2.5 flex items-center gap-4 shrink-0 select-none shadow-sm">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 shrink-0">
        <Users className="w-4 h-4 text-amber-400" />
        <span>الحلاقون المتاحون:</span>
      </div>

      {employees.length === 0 ? (
        <div className="text-xs text-slate-500 italic">
          لم يتم تسجيل حلاقين نشطين بعد من لوحة الإدارة.
        </div>
      ) : (
        <div className="flex items-center gap-2 overflow-x-auto py-0.5 scrollbar-thin">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-amber-500/40 px-3 py-1.5 rounded-xl text-xs text-slate-200 transition-all shrink-0 cursor-default shadow-sm"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold">{emp.name}</span>
              {emp.role_title && (
                <span className="text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded-md border border-slate-800">
                  {emp.role_title}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

