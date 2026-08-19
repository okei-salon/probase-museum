import { CategoryShell, PageHeading, DataPanel } from "@/components/category";
import { newsItems } from "@/data/home";

export default function NewsPage() {
  return (
    <CategoryShell theme="seasons" back={{ href: "/", label: "HOME" }}>
      <PageHeading title="お知らせ" subtitle="NEWS & UPDATES" />
      <DataPanel>
        <ul className="space-y-3">
          {newsItems.map((item) => (
            <li key={item.id} className="border-b border-white/10 pb-3 last:border-0">
              <p className="text-[12px] text-museum-gold">{item.date}</p>
              <p className="mt-1 text-[13px] text-museum-ivory">{item.title}</p>
            </li>
          ))}
        </ul>
      </DataPanel>
    </CategoryShell>
  );
}
