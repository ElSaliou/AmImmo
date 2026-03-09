import { type LucideIcon, Inbox } from "lucide-react";

interface Props {
  icon?: LucideIcon;
  title?: string;
  description?: string;
}

const EmptyState = ({ icon: Icon = Inbox, title = "Aucun élément", description }: Props) => (
  <div className="premium-card py-16 flex flex-col items-center justify-center text-center">
    <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
      <Icon className="h-7 w-7 text-muted-foreground/40" />
    </div>
    <p className="font-medium text-muted-foreground">{title}</p>
    {description && <p className="text-sm text-muted-foreground/70 mt-1">{description}</p>}
  </div>
);

export default EmptyState;
