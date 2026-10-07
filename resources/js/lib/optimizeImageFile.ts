export interface OptimizeImageFileOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    maxSizeBytes?: number;
}

interface DecodedImage {
    source: CanvasImageSource;
    width: number;
    height: number;
    cleanup: () => void;
}

const RESIZABLE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const decodeImage = async (file: File): Promise<DecodedImage> => {
    if (typeof createImageBitmap === 'function') {
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

        return {
            source: bitmap,
            width: bitmap.width,
            height: bitmap.height,
            cleanup: () => bitmap.close(),
        };
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    try {
        await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject(new Error('Gambar tidak dapat dibaca.'));
            image.src = objectUrl;
        });

        return {
            source: image,
            width: image.naturalWidth,
            height: image.naturalHeight,
            cleanup: () => URL.revokeObjectURL(objectUrl),
        };
    } catch (error) {
        URL.revokeObjectURL(objectUrl);
        throw error;
    }
};

const canvasToBlob = (
    canvas: HTMLCanvasElement,
    type: string,
    quality?: number
): Promise<Blob | null> =>
    new Promise((resolve) => {
        canvas.toBlob(resolve, type, quality);
    });

/**
 * Resizes oversized raster images before upload while preserving aspect ratio
 * and the original MIME type. Images already within both limits are returned
 * unchanged so they do not undergo unnecessary re-encoding.
 */
export async function optimizeImageFile(
    file: File,
    {
        maxWidth = 2560,
        maxHeight = 2560,
        quality = 0.92,
        maxSizeBytes,
    }: OptimizeImageFileOptions = {}
): Promise<File> {
    const normalizedType = file.type.toLowerCase() === 'image/jpg' ? 'image/jpeg' : file.type.toLowerCase();

    if (!RESIZABLE_IMAGE_TYPES.has(normalizedType)) {
        return file;
    }

    let decodedImage: DecodedImage | null = null;

    try {
        decodedImage = await decodeImage(file);

        const scale = Math.min(
            1,
            maxWidth / decodedImage.width,
            maxHeight / decodedImage.height
        );
        const exceedsDimensionLimit = scale < 1;
        const exceedsFileSizeLimit = maxSizeBytes !== undefined && file.size > maxSizeBytes;

        if (!exceedsDimensionLimit && !exceedsFileSizeLimit) {
            return file;
        }

        let targetWidth = Math.max(1, Math.round(decodedImage.width * scale));
        let targetHeight = Math.max(1, Math.round(decodedImage.height * scale));
        const canvas = document.createElement('canvas');
        const qualityCandidates = normalizedType === 'image/png'
            ? [undefined]
            : Array.from(new Set([quality, 0.9, 0.86, 0.82]));
        let optimizedBlob: Blob | null = null;

        for (let resizeAttempt = 0; resizeAttempt < 5; resizeAttempt += 1) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;

            const context = canvas.getContext('2d');
            if (!context) {
                return file;
            }

            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = 'high';
            context.drawImage(decodedImage.source, 0, 0, targetWidth, targetHeight);

            for (const candidateQuality of qualityCandidates) {
                optimizedBlob = await canvasToBlob(canvas, normalizedType, candidateQuality);

                if (!optimizedBlob || maxSizeBytes === undefined || optimizedBlob.size <= maxSizeBytes) {
                    break;
                }
            }

            if (!optimizedBlob || maxSizeBytes === undefined || optimizedBlob.size <= maxSizeBytes) {
                break;
            }

            targetWidth = Math.max(1, Math.round(targetWidth * 0.85));
            targetHeight = Math.max(1, Math.round(targetHeight * 0.85));
        }

        if (!optimizedBlob) {
            return file;
        }

        if (optimizedBlob.size >= file.size && !exceedsFileSizeLimit) {
            return file;
        }

        return new File([optimizedBlob], file.name, {
            type: normalizedType,
            lastModified: file.lastModified,
        });
    } catch {
        return file;
    } finally {
        decodedImage?.cleanup();
    }
}
