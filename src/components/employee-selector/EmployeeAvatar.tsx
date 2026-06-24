import type { Employee } from '@/types/contacts';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

// ============================================================
// EmployeeAvatar — 封装通用 ui/Avatar 用于展示员工头像
// ============================================================

export interface EmployeeAvatarProps {
  employee?: Employee;
  /** 像素尺寸（宽高相同），默认 32 */
  size?: number;
  className?: string;
}

export function EmployeeAvatar({ employee, size = 32, className }: EmployeeAvatarProps) {
  const initial = employee?.name?.charAt(0) || '?';

  return (
    <Avatar className={cn('shrink-0', className)} style={{ width: size, height: size }}>
      {employee?.avatar?.trim() && (
        <AvatarImage src={employee?.avatar} alt={employee?.name} />
      )}
      <AvatarFallback
        className="bg-primary/10 text-primary font-medium"
        style={{ fontSize: size * 0.42 }}
      >
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}
