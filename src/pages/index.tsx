import { GetStaticProps } from 'next';
import Link from 'next/link';
import { FaCalendar, FaUser } from 'react-icons/fa';

import Prismic from '@prismicio/client';
import { useCallback, useState } from 'react';
import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';
import formatShortDate from '../utils/formatDates';

import Header from '../components/Header';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
  preview: any;
}

export default function Home({
  postsPagination,
  preview,
}: HomeProps): JSX.Element {
  const [currentPosts, setCurrentPosts] = useState(postsPagination.results);
  const [hasNextPage, setHasNextPage] = useState(postsPagination.next_page);

  // Paginação prismic
  const handleLoadMore = useCallback(async () => {
    fetch(hasNextPage, {
      method: 'get',
    })
      .then(response => response.json())
      .then(data => {
        const postFormated = data.results.map(post => {
          return {
            uid: post.uid,
            first_publication_date: post.first_publication_date,
            data: {
              title: post.data.title,
              subtitle: post.data.subtitle,
              author: post.data.author,
            },
          };
        });
        setCurrentPosts([...currentPosts, ...postFormated]);
        setHasNextPage(data.next_page);
      });
  }, [currentPosts, hasNextPage]);

  return (
    <>
      <Header />
      <main className={styles.container}>
        <div className={styles.postList}>
          {currentPosts.map(post => (
            <Link key={post.uid} href={`/post/${post.uid}`}>
              <a>
                <strong className={styles.title}>{post.data.title}</strong>
                <p>{post.data.subtitle}</p>
                <div className={styles.footerInformation}>
                  <div>
                    <FaCalendar />
                    <time style={{ textTransform: 'capitalize' }}>
                      {formatShortDate(post.first_publication_date)}
                    </time>
                  </div>
                  <div>
                    <FaUser />
                    <span>{post.data.author}</span>
                  </div>
                </div>
              </a>
            </Link>
          ))}
        </div>
        {hasNextPage && (
          <button
            className={styles.loadMoreButton}
            type="button"
            onClick={handleLoadMore}
          >
            Carregar mais posts
          </button>
        )}
      </main>
      <footer className={styles.previewButtonContainer}>
        {preview ? (
          <aside>
            <Link href="/api/exit-preview">
              <a>Sair do modo Preview</a>
            </Link>
          </aside>
        ) : (
          <aside>
            <Link href="/api/preview">
              <a>Entrar no modo Preview</a>
            </Link>
          </aside>
        )}
      </footer>
    </>
  );
}

export const getStaticProps: GetStaticProps<HomeProps> = async ({
  preview = false,
  previewData,
}) => {
  // Recuperando dados do prismic
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      pageSize: 2,
      orderings: '[document.last_publication_date desc]',
      ref: previewData?.ref ?? null,
    }
  );

  // console.log(JSON.stringify(postsResponse));

  // Formatando dados do prismic
  const posts = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    };
  });

  const postsPagination = {
    results: posts,
    next_page: postsResponse.next_page,
  };

  return {
    props: {
      postsPagination,
      preview,
    },
    revalidate: 60 * 60 * 24, // 24 horas
  };
};
