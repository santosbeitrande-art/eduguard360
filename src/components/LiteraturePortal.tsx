// ============================================
// PORTAL DE LITERATURA ABERTA
// src/components/LiteraturePortal/
// ============================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, BookOpen, Share2, Heart, MapPin, Shield } from 'lucide-react';

const fallbackBooks = [
  {
    id: 'dom-quixote',
    title: 'Dom Quixote',
    authors: 'Miguel de Cervantes',
    source: 'Project Gutenberg',
    license: 'Domínio Público',
    cover_image_url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800',
    file_url: 'https://www.gutenberg.org/ebooks/9968.txt.utf-8',
    file_format: 'txt'
  },
  {
    id: 'carta-a-maria',
    title: 'Carta a Maria',
    authors: 'Pepetela',
    source: 'Repoarte',
    license: 'Creative Commons',
    cover_image_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800',
    file_url: 'https://example.com/carta-a-maria.pdf',
    file_format: 'pdf'
  },
  {
    id: 'history-of-mozambique',
    title: 'História de Moçambique',
    authors: 'M. Chissano',
    source: 'Open Library',
    license: 'Open Access',
    cover_image_url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800',
    file_url: 'https://example.com/history-of-mozambique.pdf',
    file_format: 'pdf'
  }
];

const repoarteFallbackBooks = [
  {
    id: 'rei-gazimba',
    title: 'O Rei Gazimba',
    authors: 'Mia Couto',
    source: 'Repoarte',
    license: 'Creative Commons',
    cover_image_url: 'https://images.unsplash.com/photo-1507842217343-583f7270bfba?w=800',
    file_url: 'https://example.com/o-rei-gazimba.pdf',
    file_format: 'pdf'
  },
  {
    id: 'sobre-a-idade-da-terrinha',
    title: 'Sobre a Idade da Terrinha',
    authors: 'Paulina Chiziane',
    source: 'Repoarte',
    license: 'Creative Commons',
    cover_image_url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800',
    file_url: 'https://example.com/sobre-a-idade-da-terrinha.pdf',
    file_format: 'pdf'
  }
];

export const LiteraturePortal = () => {
  const [books, setBooks] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    language: 'pt',
    license: 'all',
    country: 'all',
    source: 'all',
    subject: ''
  });
  const [activeTab, setActiveTab] = useState('explore');

  const sources = [
    { id: 'all', name: 'Todas as Fontes' },
    { id: 'openlibrary', name: 'Open Library' },
    { id: 'gutenberg', name: 'Project Gutenberg' },
    { id: 'arxiv', name: 'arXiv' },
    { id: 'ssrn', name: 'SSRN' },
    { id: 'repoarte', name: 'Repoarte.ac.mz' }
  ];

  const buildOpenLibraryUrl = (key: string) => `https://openlibrary.org${key}`;

  const mapOpenLibraryDoc = (doc: any) => ({
    id: doc.key?.replace('/works/', '') || doc.cover_edition_key || doc.key || 'unknown',
    title: doc.title || 'Título desconhecido',
    authors: doc.author_name?.join(', ') || 'Autor desconhecido',
    source: 'Open Library',
    license: doc.ebook_access || doc.has_fulltext ? 'Open Access' : 'Creative Commons',
    cover_image_url: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
      : 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800',
    file_url: buildOpenLibraryUrl(doc.key),
    file_format: doc.ebook_count_i ? 'html' : 'web',
    publish_year: doc.first_publish_year,
    subjects: doc.subject?.slice(0, 3).join(', ') || '',
    languages: doc.language?.map((lang: string) => lang).join(', ') || 'pt'
  });

  const mapGutenbergDoc = (doc: any) => ({
    id: String(doc.id),
    title: doc.title || 'Título desconhecido',
    authors: Array.isArray(doc.authors) ? doc.authors.map((a: any) => a.name).join(', ') : 'Autor desconhecido',
    source: 'Project Gutenberg',
    license: 'Domínio Público',
    cover_image_url: doc.formats['image/jpeg'] || 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800',
    file_url: doc.formats['text/html; charset=utf-8'] || doc.formats['text/plain; charset=utf-8'] || doc.formats['application/pdf'] || `https://www.gutenberg.org/ebooks/${doc.id}`,
    file_format: doc.formats['application/pdf'] ? 'pdf' : 'html',
    publish_year: doc.download_count || null,
    subjects: doc.subject?.slice(0, 3).join(', ') || '',
    languages: doc.languages?.join(', ') || 'en'
  });

  useEffect(() => {
    fetchLiterature();
  }, [search, filters]);

  const resolveBookLink = (book: any) => {
    if (book.source === 'Open Library') {
      return `/literatura/${book.id}`;
    }
    return book.file_url;
  };

  const isInternalBook = (book: any) => book.source === 'Open Library' && !!book.id;

  const fetchLiterature = async () => {
    try {
      const query = `${search.trim() || 'literature'}${filters.subject ? ` ${filters.subject}` : ''}`;
      const targetLanguage = filters.language !== 'all' ? filters.language : undefined;
      const targetCountry = filters.country !== 'all' ? filters.country : undefined;

      if (filters.source === 'gutenberg') {
        const gutenbergUrl = new URL('https://gutendex.com/books');
        gutenbergUrl.searchParams.set('search', query);
        gutenbergUrl.searchParams.set('page', '1');

        const response = await fetch(gutenbergUrl.toString());
        const data = await response.json();
        const items = Array.isArray(data.results)
          ? data.results.map(mapGutenbergDoc).slice(0, 24)
          : [];

        setBooks(items.length ? items : fallbackBooks);
        return;
      }

      const openLibraryUrl = new URL('https://openlibrary.org/search.json');
      openLibraryUrl.searchParams.set('q', query);
      openLibraryUrl.searchParams.set('limit', '24');
      if (targetLanguage) {
        openLibraryUrl.searchParams.set('language', targetLanguage);
      }
      if (targetCountry) {
        openLibraryUrl.searchParams.set('place', targetCountry);
      }
      if (filters.source === 'repoarte') {
        openLibraryUrl.searchParams.set('q', `${query} Mozambique`);
      }

      const response = await fetch(openLibraryUrl.toString());
      const data = await response.json();
      const docs = Array.isArray(data.docs) ? data.docs : [];
      const items = docs
        .filter((doc) => doc.key && doc.title)
        .map(mapOpenLibraryDoc)
        .slice(0, 24);

      if (filters.source === 'repoarte') {
        const repoItems = items.filter((item) => item.title.toLowerCase().includes('moçambique') || item.authors.toLowerCase().includes('mozambique'));
        setBooks(repoItems.length ? repoItems : repoarteFallbackBooks);
      } else {
        setBooks(items.length ? items : fallbackBooks);
      }
    } catch (error) {
      console.warn('Erro ao buscar literatura. Usando conteúdo de fallback.', error);
      setBooks(fallbackBooks);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Hero */}
      <section className="py-12 px-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4">
            Portal de Literatura Aberta
          </h1>
          <p className="text-lg opacity-90 mb-8">
            Acesso livre a 50.000+ livros e artigos académicos de domínio público e Creative Commons
          </p>
          <Input
            type="search"
            placeholder="Buscar livros, autores, tópicos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-2xl text-black"
          />
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="explore">Explorar</TabsTrigger>
            <TabsTrigger value="collections">Coleções</TabsTrigger>
            <TabsTrigger value="mozambique">Moçambique</TabsTrigger>
            <TabsTrigger value="saved">Guardados</TabsTrigger>
          </TabsList>

          {/* EXPLORAR */}
          <TabsContent value="explore" className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Filtros */}
              <aside className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Filtros</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Idioma */}
                    <div>
                      <label htmlFor="filter-language" className="block text-sm font-semibold mb-2">Idioma</label>
                      <select
                        id="filter-language"
                        value={filters.language}
                        onChange={(e) => setFilters({ ...filters, language: e.target.value })}
                        className="w-full border rounded px-2 py-2"
                      >
                        <option value="pt">Português</option>
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                      </select>
                    </div>

                    {/* Licença */}
                    <div>
                      <label htmlFor="filter-license" className="block text-sm font-semibold mb-2">Licença</label>
                      <select
                        id="filter-license"
                        value={filters.license}
                        onChange={(e) => setFilters({ ...filters, license: e.target.value })}
                        className="w-full border rounded px-2 py-2"
                      >
                        <option value="all">Todas</option>
                        <option value="public_domain">Domínio Público</option>
                        <option value="cc_by">Creative Commons</option>
                        <option value="open_access">Open Access</option>
                      </select>
                    </div>

                    {/* Assunto */}
                    <div>
                      <label htmlFor="filter-subject" className="block text-sm font-semibold mb-2">Assunto / Tema</label>
                      <input
                        id="filter-subject"
                        type="text"
                        value={filters.subject}
                        onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                        placeholder="História, literatura, educação"
                        className="w-full border rounded px-2 py-2"
                      />
                    </div>

                    {/* Fonte */}
                    <div>
                      <label htmlFor="filter-source" className="block text-sm font-semibold mb-2">Fonte</label>
                      <select
                        id="filter-source"
                        value={filters.source}
                        onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                        className="w-full border rounded px-2 py-2"
                      >
                        {sources.map(source => (
                          <option key={source.id} value={source.id}>{source.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="text-xs text-gray-500">
                      Selecione Gutenberg para resultados de Project Gutenberg ou Repoarte para conteúdos moçambicanos.
                    </div>

                    {/* País */}
                    <div>
                      <label htmlFor="filter-country" className="block text-sm font-semibold mb-2">País</label>
                      <select
                        id="filter-country"
                        value={filters.country}
                        onChange={(e) => setFilters({ ...filters, country: e.target.value })}
                        className="w-full border rounded px-2 py-2"
                      >
                        <option value="all">Todos</option>
                        <option value="mozambique">Moçambique</option>
                        <option value="portugal">Portugal</option>
                        <option value="brazil">Brasil</option>
                      </select>
                    </div>
                  </CardContent>
                </Card>
              </aside>

              {/* Livros */}
              <main className="lg:col-span-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {books.map(book => (
                    <LiteratureCard key={book.id} book={book} resolveBookLink={resolveBookLink} isInternalBook={isInternalBook} />
                  ))}
                </div>
              </main>
            </div>
          </TabsContent>

          {/* COLEÇÕES */}
          <TabsContent value="collections" className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Coleção Exemplo */}
              <CollectionCard 
                title="Clássicos da Literatura Portuguesa"
                description="Obras imortais de autores portugueses"
                itemCount={150}
                image="https://images.unsplash.com/photo-1507842217343-583f7270bfba?w=400"
              />
              <CollectionCard 
                title="Artigos Científicos"
                description="Pesquisa académica de acesso livre"
                itemCount={5200}
                image="https://images.unsplash.com/photo-1507842217343-583f7270bfba?w=400"
              />
              <CollectionCard 
                title="Autores Moçambicanos"
                description="Obras de escritores de Moçambique"
                itemCount={45}
                image="https://images.unsplash.com/photo-1507842217343-583f7270bfba?w=400"
              />
            </div>
          </TabsContent>

          {/* MOÇAMBIQUE */}
          <TabsContent value="mozambique" className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Literatura Moçambicana
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600">
                    Explore obras de autores moçambicanos clássicos e contemporâneos.
                  </p>
                  <Button className="w-full">Ver Autores</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Repositório Nacional</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600">
                    Teses, dissertações e publicações académicas de instituições nacionais.
                  </p>
                  <Button className="w-full">Aceder Repoarte</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pesquisa em Desenvolvimento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600">
                    Artigos sobre desenvolvimento em Moçambique e região.
                  </p>
                  <Button className="w-full">Pesquisar</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* GUARDADOS */}
          <TabsContent value="saved" className="mt-8">
            <div className="text-center py-12 text-gray-500">
              <Heart size={48} className="mx-auto mb-4 opacity-50" />
              <p>Nenhum livro guardado ainda</p>
              <p className="text-sm">Os livros que guardar aparecerão aqui</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Card do Livro
export const LiteratureCard = ({ book, resolveBookLink, isInternalBook }) => {
  const [saved, setSaved] = useState(false);
  const bookLink = resolveBookLink(book);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition">
      <div className="relative h-48 bg-gradient-to-br from-amber-100 to-orange-100 overflow-hidden group">
        {book.cover_image_url ? (
          <img 
            src={book.cover_image_url}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-amber-200">
            <BookOpen size={48} className="text-amber-700 opacity-50" />
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <p className="text-xs text-amber-600 font-semibold uppercase mb-1">
          {book.source}
        </p>
        <h3 className="font-bold text-lg mb-1 line-clamp-2">{book.title}</h3>
        <p className="text-sm text-gray-600 mb-2">{book.authors}</p>

        {/* Info */}
        <div className="flex items-center gap-1 mb-3 text-xs text-gray-600">
          <Shield size={14} />
          <span>{book.license}</span>
        </div>

        {/* Botões */}
        <div className="flex gap-2">
          {isInternalBook(book) ? (
            <Button size="sm" className="flex-1" asChild>
              <Link to={bookLink}>Ver</Link>
            </Button>
          ) : (
            <Button size="sm" className="flex-1" asChild>
              <a href={bookLink} target="_blank" rel="noreferrer">Ver</a>
            </Button>
          )}
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setSaved(!saved)}
          >
            <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => navigator.share({ title: book.title, url: window.location.href })}
          >
            <Share2 size={16} />
          </Button>
        </div>

        {/* Download / Acesso */}
        <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
          <a href={book.file_url} target="_blank" rel="noreferrer" {...(['pdf','txt'].includes(book.file_format) ? { download: true } : {})}>
            <Download size={16} className="mr-1" />
            Acessar {book.file_format.toUpperCase()}
          </a>
        </Button>
      </CardContent>
    </Card>
  );
};

// Card de Coleção
export const CollectionCard = ({ title, description, itemCount, image }) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition cursor-pointer">
      <div className="relative h-40 overflow-hidden group">
        <img 
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition"
        />
      </div>
      <CardContent className="p-4">
        <h3 className="font-bold text-lg mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-3">{description}</p>
        <p className="text-sm text-amber-600 font-semibold mb-3">
          {itemCount} itens
        </p>
        <Button className="w-full" variant="outline">Explorar</Button>
      </CardContent>
    </Card>
  );
};

// Leitor de Literatura
export const LiteratureReader = ({ bookId }) => {
  const [book, setBook] = useState<any>(null);
  const [authors, setAuthors] = useState<string>('Autor desconhecido');
  const [annotations, setAnnotations] = useState<any[]>([]);

  useEffect(() => {
    fetchBook();
  }, [bookId]);

  const fetchBook = async () => {
    try {
      if (/^\d+$/.test(bookId)) {
        const response = await fetch(`https://gutendex.com/books/${bookId}`);
        if (!response.ok) throw new Error('Não foi possível carregar o livro Gutenberg');
        const data = await response.json();
        const gutenbergBook = mapGutenbergDoc(data);
        setAuthors(gutenbergBook.authors);
        setBook({
          ...gutenbergBook,
          id: bookId,
          file_url: gutenbergBook.file_url,
          file_format: gutenbergBook.file_format
        });
        return;
      }

      const response = await fetch(`https://openlibrary.org/works/${bookId}.json`);
      if (!response.ok) throw new Error('Não foi possível carregar o livro');
      const data = await response.json();
      const authorNames = await Promise.all(
        (data.authors || []).map(async (authorRef) => {
          try {
            const authorResponse = await fetch(`https://openlibrary.org${authorRef.author.key}.json`);
            const authorData = await authorResponse.json();
            return authorData.name;
          } catch {
            return 'Autor desconhecido';
          }
        })
      );

      setAuthors(authorNames.filter(Boolean).join(', ') || 'Autor desconhecido');
      setBook({
        id: bookId,
        title: data.title,
        authors: authorNames.join(', '),
        description:
          typeof data.description === 'string'
            ? data.description
            : data.description?.value || 'Resumo não disponível.',
        subjects: data.subjects?.slice(0, 6).join(', ') || 'Sem assuntos definidos',
        openlibrary_url: `https://openlibrary.org/works/${bookId}`,
        cover_image_url: data.covers?.length
          ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg`
          : 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800',
        file_url: `https://openlibrary.org/works/${bookId}`,
        file_format: 'web'
      });
    } catch (error) {
      console.warn('Erro ao carregar livro. Usando fallback se disponível.', error);
      const fallback = fallbackBooks.find((item) => item.id === bookId) || repoarteFallbackBooks.find((item) => item.id === bookId);
      setBook(fallback || null);
      if (fallback) {
        setAuthors(fallback.authors || 'Autor desconhecido');
      }
    }
  };

  const handleHighlight = () => {
    const selectedText = window.getSelection().toString();
    if (selectedText) {
      setAnnotations([
        ...annotations,
        { text: selectedText, page: annotations.length + 1 }
      ]);
    }
  };

  if (!book) return <div>Carregando...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-screen">
      {/* Leitor */}
      <div className="lg:col-span-3 bg-white p-8 overflow-auto" onMouseUp={handleHighlight}>
        {book.file_format === 'pdf' || book.file_format === 'txt' ? (
          <iframe
            src={book.file_url}
            className="w-full h-full"
            title="PDF Reader"
          />
        ) : (
          <div className="prose max-w-none text-gray-800">
            <h2>{book.title}</h2>
            <p className="text-sm text-gray-500 mb-4">{book.authors}</p>
            <p className="mb-4">{book.description}</p>
            <p className="text-sm text-gray-600 mb-4">
              Assuntos: {book.subjects}
            </p>
            <a
              href={book.openlibrary_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full bg-amber-600 px-4 py-3 text-white hover:bg-amber-700"
            >
              Abrir no Open Library
            </a>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <aside className="bg-gray-50 border-l p-4 overflow-auto">
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="notes">Notas</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <div>
              <h3 className="font-bold">{book.title}</h3>
              <p className="text-sm text-gray-600">{authors}</p>
            </div>
            <Button className="w-full" asChild>
              <a href={book.openlibrary_url || book.file_url} target="_blank" rel="noreferrer">
                {book.openlibrary_url ? 'Abrir na página do livro' : 'Abrir obra'}
              </a>
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigator.share?.({ title: book.title, url: book.openlibrary_url || book.file_url })}>
              Partilhar
            </Button>
          </TabsContent>

          <TabsContent value="notes" className="space-y-3">
            {annotations.length === 0 ? (
              <p className="text-sm text-gray-500">Selecione texto no livro para guardar uma nota.</p>
            ) : (
              annotations.map((ann, i) => (
                <Card key={i}>
                  <CardContent className="pt-4 text-sm">
                    <p className="italic mb-2">"{ann.text}"</p>
                    <p className="text-xs text-gray-600">Nota {i + 1}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </aside>
    </div>
  );
};

export default LiteraturePortal;
