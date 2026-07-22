import { Construction } from "lucide-react";

export default function ComingSoon({ title }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-bmw-blue">Módulo</p>
      <h1 className="font-display text-3xl sm:text-4xl font-light mt-2">{title}</h1>
      <div className="mt-8 rounded-2xl border border-border bg-white p-10 shadow-soft flex flex-col items-center text-center">
        <div className="h-14 w-14 rounded-2xl bg-bmw-surface grid place-items-center">
          <Construction className="h-6 w-6 text-bmw-blue" strokeWidth={1.75} />
        </div>
        <h2 className="font-display text-xl mt-5">Próximamente</h2>
        <p className="text-bmw-soft/70 mt-2 max-w-sm">
          Este módulo forma parte de la hoja de ruta. Se desarrollará en las siguientes fases del proyecto.
        </p>
      </div>
    </div>
  );
}
