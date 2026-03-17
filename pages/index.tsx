import type { GetServerSideProps, InferGetServerSidePropsType } from "next";

import WeddingTemplate from "../components/WeddingTemplate";
import { mapWeddingToWeddingData, type WeddingData } from "../lib/wedding-data";
import { prisma } from "../lib/prisma";

type HomePageProps = {
  weddingData: WeddingData;
};

export const getServerSideProps: GetServerSideProps<HomePageProps> = async () => {
  const wedding = await prisma.wedding.findFirst({
    include: {
      loveStory: {
        orderBy: {
          order: "asc",
        },
      },
      weddingEvents: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!wedding) {
    return {
      notFound: true,
    };
  }

  const weddingData = mapWeddingToWeddingData(wedding);

  return {
    props: {
      weddingData,
    },
  };
};

export default function HomePage({
  weddingData,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return <WeddingTemplate data={weddingData} />;
}
