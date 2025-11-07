import { isIpfsUri } from "@dexkit/core/utils/ipfs";
import { WHITELISTED_IMAGE_DOMAINS } from "../constants";

export function isWhitelistedDomain(src: string) {
  if (isIpfsUri(src)) {
    return src;
  } else {
    const imageUrl = new URL(src);
    return WHITELISTED_IMAGE_DOMAINS.includes(imageUrl.hostname);
  }
}

export function dataURItoBlob(dataURI: string) {
  // convert base64 to raw binary data held in a string
  // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
  let byteString = atob(dataURI.split(",")[1]);

  // separate out the mime component
  let mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];

  // write the bytes of the string to an ArrayBuffer
  let ab = new ArrayBuffer(byteString.length);

  // create a view into the buffer
  let ia = new Uint8Array(ab);

  // set the bytes of the buffer to the correct values
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  // write the ArrayBuffer to a blob, and you're done
  let blob = new Blob([ab], { type: mimeString });

  return blob;
}
