import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllSlugs, getPostBySlug } from "@/lib/blog";
import { Markdown } from "@/components/markdown";

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post Not Found" };
  
  return {
    title: `${post.title} — Kell`,
    description: post.description,
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  
  if (!post) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-2xl px-6 py-12">
      <Link 
        href="/blog" 
        className="text-sm text-zinc-500 hover:text-zinc-300 mb-8 inline-block"
      >
        ← Back to blog
      </Link>
      
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight mb-3">
          {post.title}
        </h1>
        <p className="text-zinc-400 text-lg mb-4">{post.description}</p>
        <time className="text-sm text-zinc-600">
          {new Date(post.date).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </time>
      </header>

      <div className="prose-custom">
        <Markdown content={post.content} />
      </div>

      <footer className="mt-12 pt-8 border-t border-white/10">
        <p className="text-sm text-zinc-500">
          Want more competitive intelligence?{" "}
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            Join the waitlist
          </Link>
          {" "}for daily updates.
        </p>
      </footer>
    </article>
  );
}
