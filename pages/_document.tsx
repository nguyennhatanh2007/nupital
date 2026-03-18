import { Head, Html, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="/css/animate.css" />
        <link rel="stylesheet" href="/css/icomoon.css" />
        <link rel="stylesheet" href="/css/bootstrap.css" />
        <link rel="stylesheet" href="/css/superfish.css" />
        <link rel="stylesheet" href="/css/magnific-popup.css" />
        <link rel="stylesheet" href="/css/style.css" />
        <script src="/js/jquery.min.js" defer></script>
        <script src="/js/jquery.magnific-popup.min.js" defer data-loaded></script>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}