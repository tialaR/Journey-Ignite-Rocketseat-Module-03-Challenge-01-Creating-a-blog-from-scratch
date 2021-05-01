import { GetStaticPaths, GetStaticProps } from 'next';
import { FaCalendar, FaUser, FaClock } from 'react-icons/fa';
import { useRouter } from 'next/router';
import { RichText } from 'prismic-dom';
import Link from 'next/link';

import Prismic from '@prismicio/client';
import { useCallback, useMemo, useState } from 'react';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import formatShortDate, { formatHour } from '../../utils/formatDates';
import styles from './post.module.scss';
import Header from '../../components/Header';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  previousPost: { uid: string; title: string };
  nextPost: { uid: string; title: string };
}

const woordsPerMinute = 250;

export default function Post({
  post,
  previousPost,
  nextPost,
}: PostProps): JSX.Element {
  const router = useRouter();

  const [timeOfReedInMinutes, setTimeOfReedInMinutes] = useState(0);

  // Calculo do tempo de leitura do blog
  useMemo(() => {
    const wordsSize = post.data.content.reduce((accumulator, currentValue) => {
      const headingSize = currentValue.heading.split('').length;

      const bodySize = currentValue.body.reduce(
        (bodyAccumulator, currentBodyValue) => {
          const bodyTextSize = currentBodyValue.text.split('').length;
          return bodyAccumulator + bodyTextSize;
        },
        0
      );

      return headingSize + bodySize;
    }, 0);

    setTimeOfReedInMinutes(Math.ceil(wordsSize / woordsPerMinute));
  }, [post.data.content]);

  // Componente de comentários (Utterance)
  const utterancesComments = useCallback(
    () => (
      <section
        ref={elem => {
          if (!elem) {
            return;
          }
          const scriptElem = document.createElement('script');
          scriptElem.src = 'https://utteranc.es/client.js';
          scriptElem.async = true;
          scriptElem.crossOrigin = 'anonymous';
          scriptElem.setAttribute(
            'repo',
            'tialaR/Journey-Ignite-Rocketseat-Module-03-Challenge-01-Creating-a-blog-from-scratch'
          );
          scriptElem.setAttribute('issue-term', 'pathname');
          scriptElem.setAttribute('label', 'blog-comment');
          scriptElem.setAttribute('theme', 'github-dark');
          elem.appendChild(scriptElem);
        }}
      />
    ),
    []
  );

  if (router.isFallback) {
    return <p>Carregando...</p>;
  }

  return (
    <>
      <Header />
      <main className={styles.container}>
        <img src={post.data.banner.url} alt={post.data.title} />
        <article>
          <div className={styles.imageContainer} />
          <h1>{post.data.title}</h1>
          <div className={styles.contentContainer}>
            <div className={styles.publicationInformationsContainer}>
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
              <div>
                <FaClock />
                <time>{timeOfReedInMinutes} min</time>
              </div>
            </div>
            {post.last_publication_date && (
              <i className={styles.lastPublication}>
                * editado em
                <time style={{ textTransform: 'capitalize' }}>
                  {` ${formatShortDate(post.last_publication_date)}`}
                </time>
                <time>{`, às ${formatHour(post.last_publication_date)}`}</time>
              </i>
            )}
          </div>

          <div className={styles.postContentContainer}>
            {post.data.content.map(item => (
              <section key={item.heading}>
                <h2>{item.heading}</h2>
                <div
                  dangerouslySetInnerHTML={{
                    __html: RichText.asHtml(item.body),
                  }}
                />
              </section>
            ))}
          </div>
          <footer className={styles.footer}>
            {previousPost.uid ? (
              <Link href={`${previousPost.uid}`}>
                <a>
                  {previousPost.title}
                  <strong>Post anterior</strong>
                </a>
              </Link>
            ) : (
              <div />
            )}

            {nextPost.uid ? (
              <Link href={`${nextPost.uid}`}>
                <a>
                  {nextPost.title}
                  <strong>Próximo post</strong>
                </a>
              </Link>
            ) : (
              <div />
            )}
          </footer>
          {utterancesComments()}
        </article>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  // Recuperando posts que serão gerados de forma estática
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query([
    Prismic.predicates.at('document.type', 'posts'),
  ]);

  // Criando array de posts que serão gerados de forma estática no momento da build
  const paths = postsResponse.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });

  return {
    paths,
    fallback: 'blocking',
  };
};

// Posts que serão gerados de forma estática no momento do acesso
export const getStaticProps: GetStaticProps = async context => {
  // Recuperando slug do post acessado
  const { slug } = context.params;

  const prismic = getPrismicClient();
  // Buscando post acessado pelo UID:
  const response = await prismic.getByUID('posts', String(slug), {});

  // Formatando post
  const post = {
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    uid: response.uid,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: response.data.banner,
      author: response.data.author,
      content: response.data.content.map(({ heading, body }) => {
        return {
          heading,
          body,
        };
      }),
    },
  };

  // recuperando post anterior
  const responsePreviousPost = (
    await prismic.query(
      Prismic.Predicates.dateBefore(
        'document.first_publication_date',
        response.first_publication_date
      ),
      { orderings: '[document.first_publication_date]' }
    )
  ).results.pop();

  // Recuperando próximo post
  const responseNextPost = (
    await prismic.query(
      Prismic.Predicates.dateAfter(
        'document.first_publication_date',
        response.first_publication_date
      ),
      { orderings: '[document.first_publication_date]' }
    )
  ).results[0];

  // Formatando posts
  const previousPost = {
    uid: responsePreviousPost?.uid ?? '',
    title: responsePreviousPost?.data.title ?? '',
  };

  const nextPost = {
    uid: responseNextPost?.uid ?? '',
    title: responseNextPost?.data.title ?? '',
  };

  // console.log(JSON.stringify(post, null, 2));

  return {
    props: {
      post,
      previousPost,
      nextPost,
    },
    revalidate: 60 * 60 * 30, // 24 hours
  };
};
