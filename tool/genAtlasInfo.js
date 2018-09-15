const fsPromises = require('fs').promises;

[
    'asset-gen/atlas_720_0.json',
    'asset-gen/atlas_1080_0.json',
    'asset-gen/atlas_2160_0.json',
    'asset-gen/atlas_4320_0.json'
]
    .forEach((srcFile, index) =>
        fsPromises.readFile(srcFile)
            .catch(reason => console.log(reason))
            .then(data => {
                const json = JSON.parse(data);

                const length = json.frames.length;
                const width = json.meta.size.w;
                const height = json.meta.size.h;

                const subImages = new Float32Array(length * 4);
                const dimensions = new Uint32Array(length * 2);

                let constants = 'export const\n';

                json.frames.forEach((frame, i) => {
                    const j = i * 4;
                    subImages[j] = frame.frame.x / width;
                    subImages[j + 1] = frame.frame.y / height;
                    subImages[j + 2] = frame.frame.w / width;
                    subImages[j + 3] = frame.frame.h / height;

                    const k = i * 2;
                    dimensions[k] = frame.frame.w / 2;
                    dimensions[k + 1] = frame.frame.h / 2;

                    if (index == 0) {
                        constants += `    ${frame.filename.toUpperCase().replace(/-/g, '_')} = ${i}`;
                        constants += i == length - 1 ? ';' : ',\n';
                    }
                });


                if (index == 0) {
                    fsPromises.writeFile('code-gen/SubImage.js', constants)
                        .then(() => console.log('success: file SubImage.js created'))
                        .catch(reason => console.log('error: ' + reason));
                }

                const resolutionKey = srcFile.substring(srcFile.indexOf('_') + 1, srcFile.lastIndexOf('_'));

                fsPromises.writeFile(`asset-gen/sub-images_${resolutionKey}.h5`, Buffer.from(subImages.buffer))
                    .then(() => console.log(`success: asset-gen/sub-images_${resolutionKey}.h5 created`))
                    .catch(reason => console.log('error: ' + reason));

                fsPromises.writeFile(`asset-gen/sprite-dimensions_${resolutionKey}.h5`, Buffer.from(dimensions.buffer))
                    .then(() => console.log(`success: asset-gen/sprite-dimensions_${resolutionKey}.h5 created`))
                    .catch(reason => console.log('error: ' + reason));
            }));
