-- CreateEnum
CREATE TYPE "ProductImageRole" AS ENUM ('GALLERY', 'DETAIL');

-- AlterTable
ALTER TABLE "product_images" ADD COLUMN     "role" "ProductImageRole" NOT NULL DEFAULT 'GALLERY';
