export const capitalize = (str) => {
  if (!str) {
    return ""; // Or some other default value
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}