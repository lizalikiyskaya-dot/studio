import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import { markedTitle } from "@/components/markedTitle";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-white px-6">
      <div className="w-full max-w-md text-center">
        <Wordmark />
        <h1 className="page-title mt-8">{markedTitle("Такой страницы нет")}</h1>
        <p className="page-lead mx-auto">Проверьте адрес или вернитесь на главную.</p>
        <Link href="/" className="btn-y mt-6 inline-flex !w-auto px-6">На главную</Link>
      </div>
    </main>
  );
}
