import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.loveStoryEvent.deleteMany();
  await prisma.bankQrInfo.deleteMany();
  await prisma.wedding.deleteMany();

  await prisma.wedding.create({
    data: {
      groomName: "Jack Wood",
      brideName: "Rose Thomas",
      weddingDate: new Date("2027-12-28T00:00:00.000Z"),
      location: "Boracay, Philippines",
      heroImage: "/images/cover_bg_1.jpg",
      groomImage: "/images/groom.jpg",
      brideImage: "/images/bride.jpg",
      gallery: [
        "/images/gallery-1.jpg",
        "/images/gallery-2.jpg",
        "/images/gallery-3.jpg",
        "/images/gallery-4.jpg",
        "/images/gallery-5.jpg",
        "/images/gallery-6.jpg",
        "/images/gallery-7.jpg",
        "/images/gallery-1.jpg",
        "/images/gallery-2.jpg",
        "/images/gallery-3.jpg",
        "/images/gallery-4.jpg",
        "/images/gallery-5.jpg"
      ],
      loveStory: {
        create: [
          {
            title: "First Meet",
            eventDate: new Date("2018-06-11T00:00:00.000Z"),
            description: "We met at a beach gathering and talked until sunset.",
            image: "/images/gallery-1.jpg",
            order: 1,
          },
          {
            title: "Engagement Day",
            eventDate: new Date("2025-02-14T00:00:00.000Z"),
            description: "A quiet dinner turned into the easiest yes of our lives.",
            image: "/images/gallery-2.jpg",
            order: 2,
          },
          {
            title: "Wedding Countdown",
            eventDate: new Date("2027-12-01T00:00:00.000Z"),
            description: "Final preparations, family calls, and happy chaos everywhere.",
            image: "/images/gallery-3.jpg",
            order: 3,
          },
          {
            title: "The Big Day",
            eventDate: new Date("2027-12-28T00:00:00.000Z"),
            description: "Surrounded by family and friends, we said \"I do\" under the sun.",
            image: "/images/gallery-4.jpg",
            order: 4,
          },
        ],
      },
      weddingEvents: {
        create: [
          {
            type: "GROOM_PARTY",
            title: "Tiệc Cưới Nhà Trai",
            dateTime: new Date("2027-12-27T18:00:00.000Z"),
            lunarDate: "Ngày 19 tháng 11 năm Đinh Mùi (Âm lịch)",
            locationName: "Tư Gia Nhà Trai - Quận 7, TP.HCM",
            locationUrl: "https://maps.google.com/?q=10.729,106.721",
          },
          {
            type: "BRIDE_PARTY",
            title: "Tiệc Cưới Nhà Gái",
            dateTime: new Date("2027-12-28T03:00:00.000Z"),
            lunarDate: "Ngày 20 tháng 11 năm Đinh Mùi (Âm lịch)",
            locationName: "Tư Gia Nhà Gái - Thủ Đức, TP.HCM",
            locationUrl: "https://maps.google.com/?q=10.841,106.809",
          },
          {
            type: "CEREMONY",
            title: "Lễ Thành Hôn",
            dateTime: new Date("2027-12-28T10:00:00.000Z"),
            lunarDate: "Ngày 20 tháng 11 năm Đinh Mùi (Âm lịch)",
            locationName: "Riverside Palace, TP.HCM",
            locationUrl: "https://maps.google.com/?q=10.762,106.706",
          },
        ],
      },
      bankQrInfo: {
        create: {
          bankName: "VCB",
          accountNumber: "123456789",
          ownerName: "Rose Thomas",
          qrImage: "/images/gallery-4.jpg",
          groomBankName: "ACB",
          groomAccountNumber: "0911222333",
          groomOwnerName: "Jack Wood",
          groomQrImage: "/images/gallery-4.jpg",
          brideBankName: "VCB",
          brideAccountNumber: "123456789",
          brideOwnerName: "Rose Thomas",
          brideQrImage: "/images/gallery-5.jpg",
        },
      },
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });