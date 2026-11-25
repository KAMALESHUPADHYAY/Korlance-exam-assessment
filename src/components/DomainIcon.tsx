import React from "react";
import {
  BarChart3,
  Cloud,
  Code2,
  Compass,
  Cpu,
  Database,
  FlaskConical,
  Globe,
  Layers,
  Megaphone,
  Microchip,
  Palette,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  Wifi,
} from "lucide-react";
import type { DomainMeta } from "@/lib/domains";

export function DomainIcon({
  iconKey,
  className = "h-4 w-4",
}: {
  iconKey: DomainMeta["iconKey"];
  className?: string;
}) {
  switch (iconKey) {
    case "flask":
      return <FlaskConical className={className} />;
    case "bar-chart":
      return <BarChart3 className={className} />;
    case "cpu":
      return <Cpu className={className} />;
    case "globe":
      return <Globe className={className} />;
    case "smartphone":
      return <Smartphone className={className} />;
    case "code":
      return <Code2 className={className} />;
    case "database":
      return <Database className={className} />;
    case "shield":
      return <ShieldCheck className={className} />;
    case "cloud":
      return <Cloud className={className} />;
    case "wifi":
      return <Wifi className={className} />;
    case "microchip":
      return <Microchip className={className} />;
    case "layers":
      return <Layers className={className} />;
    case "palette":
      return <Palette className={className} />;
    case "compass":
      return <Compass className={className} />;
    case "megaphone":
      return <Megaphone className={className} />;
    case "trending-up":
      return <TrendingUp className={className} />;
  }
}
