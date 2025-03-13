import { Link } from 'react-router-dom'

interface LogoProps {
  className?: string
  width?: number
  height?: number
}

export function Logo({ className = '', width = 75, height = 27 }: LogoProps) {
  // Define viewBox dimensions
  const viewBoxWidth = 82
  const viewBoxHeight = 61

  return (
    <Link to="/" className={className}>
      <svg 
        width={width} 
        height={height}
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="text-violet-600 dark:text-violet-100"
        preserveAspectRatio="xMidYMid meet"
      >
        <path d="M29.1356 45.9449C29.6818 45.9449 30.102 46.197 30.3961 46.7012C30.7323 47.2054 30.9004 47.8987 30.9004 48.7811C30.9004 50.4618 30.5012 51.7644 29.7028 52.6888C28.1482 54.5796 25.9422 56.3234 23.0849 57.9201C20.2697 59.5168 17.2444 60.3151 14.009 60.3151C9.59705 60.3151 6.17256 59.1176 3.73549 56.7226C1.29843 54.3275 0.079895 51.0501 0.079895 46.8903C0.079895 43.991 0.689161 41.3018 1.90769 38.8228C3.12623 36.3016 4.80696 34.3058 6.9499 32.8351C9.13485 31.3645 11.5929 30.6292 14.3241 30.6292C16.7612 30.6292 18.715 31.3645 20.1857 32.8351C21.6563 34.2638 22.3916 36.2176 22.3916 38.6967C22.3916 41.596 21.3412 44.0961 19.2403 46.197C17.1814 48.2559 13.6728 49.8946 8.71467 51.1131C9.76513 53.046 11.761 54.0124 14.7023 54.0124C16.5931 54.0124 18.736 53.3611 21.1311 52.0585C23.5682 50.7139 25.6691 48.9702 27.4338 46.8272C27.9381 46.239 28.5053 45.9449 29.1356 45.9449ZM13.2527 36.8059C11.698 36.8059 10.3744 37.7093 9.28191 39.5161C8.23146 41.3228 7.70623 43.5078 7.70623 46.0709V46.197C10.1853 45.6087 12.1392 44.7263 13.5678 43.5498C14.9964 42.3733 15.7107 41.0077 15.7107 39.453C15.7107 38.6547 15.4796 38.0244 15.0174 37.5622C14.5972 37.058 14.009 36.8059 13.2527 36.8059Z" fill="currentColor"/>
        <path d="M59.2992 40.6506C59.8454 40.6506 60.2656 40.9237 60.5597 41.4699C60.8539 42.0161 61.0009 42.7094 61.0009 43.5498C61.0009 44.6003 60.8539 45.4196 60.5597 46.0079C60.2656 46.5541 59.8034 46.9323 59.1731 47.1424C56.652 48.0248 53.8788 48.529 50.8535 48.655C50.0131 52.1426 48.4164 54.9578 46.0634 57.1007C43.7524 59.2437 41.1893 60.3151 38.374 60.3151C34.1302 60.3151 31.0418 58.6974 29.109 55.462C27.1762 52.2266 26.2097 47.5416 26.2097 41.4069C26.2097 35.9865 26.882 30.1039 28.2266 23.7592C29.5712 17.3724 31.5251 11.952 34.0882 7.49807C36.6933 3.0021 39.7817 0.75412 43.3532 0.75412C45.2861 0.75412 46.8407 1.59449 48.0173 3.27522C49.1938 4.91394 49.782 7.05687 49.782 9.70403C49.782 13.1495 49.1307 16.574 47.8282 19.9775C46.5256 23.381 44.3617 26.9526 41.3363 30.6922C44.1516 30.9023 46.4416 32.0788 48.2063 34.2217C49.9711 36.3227 51.0216 38.9278 51.3577 42.0372C53.3326 41.9111 55.6856 41.4909 58.4168 40.7766C58.6689 40.6926 58.963 40.6506 59.2992 40.6506ZM41.9036 6.99385C41.0632 6.99385 40.1388 8.2544 39.1304 10.7755C38.164 13.2546 37.2606 16.6371 36.4202 20.9229C35.5798 25.2088 34.9495 29.8939 34.5294 34.9781C37.3026 29.8939 39.5085 25.4189 41.1473 21.5532C42.828 17.6455 43.6684 14.179 43.6684 11.1537C43.6684 9.80908 43.5003 8.77963 43.1641 8.06531C42.87 7.351 42.4498 6.99385 41.9036 6.99385ZM38.6262 53.6342C39.9287 53.6342 41.0842 53.088 42.0927 51.9955C43.1011 50.903 43.7734 49.3273 44.1096 47.2684C42.807 46.3861 41.7985 45.2305 41.0842 43.8019C40.4119 42.3733 40.0758 40.8606 40.0758 39.2639C40.0758 38.6757 40.1598 37.8773 40.3279 36.8689H40.1388C38.4161 36.8689 36.9664 37.7303 35.7899 39.453C34.6554 41.1338 34.0882 43.4028 34.0882 46.26C34.0882 48.655 34.5294 50.4828 35.4118 51.7434C36.3362 53.0039 37.4076 53.6342 38.6262 53.6342Z" fill="currentColor"/>
        <path d="M68.0383 60.3151C63.8365 60.3151 60.7692 58.6974 58.8363 55.462C56.9455 52.2266 56.0001 47.5416 56.0001 41.4069C56.0001 35.9865 56.6724 30.1039 58.017 23.7592C59.3616 17.3724 61.3154 11.952 63.8785 7.49807C66.4837 3.0021 69.572 0.75412 73.1436 0.75412C75.0764 0.75412 76.6311 1.59449 77.8076 3.27522C78.9841 4.91394 79.5724 7.05687 79.5724 9.70403C79.5724 13.1495 78.9211 16.574 77.6185 19.9775C76.316 23.381 74.152 26.9526 71.1267 30.6922C73.1856 30.8603 74.9714 31.5536 76.484 32.7721C78.0387 33.9906 79.2152 35.5663 80.0136 37.4992C80.8539 39.432 81.2741 41.5329 81.2741 43.8019C81.2741 46.9533 80.6439 49.7895 79.3833 52.3106C78.1648 54.8317 76.5471 56.8066 74.5302 58.2352C72.5133 59.6218 70.3494 60.3151 68.0383 60.3151ZM64.3197 34.9781C67.0929 29.8939 69.2989 25.4189 70.9376 21.5532C72.6183 17.6455 73.4587 14.179 73.4587 11.1537C73.4587 9.80908 73.2906 8.77963 72.9545 8.06531C72.6604 7.351 72.2402 6.99385 71.6939 6.99385C70.8536 6.99385 69.9292 8.2544 68.9207 10.7755C67.9543 13.2546 67.0509 16.6371 66.2105 20.9229C65.3702 25.2088 64.7399 29.8939 64.3197 34.9781ZM68.2905 53.5082C69.7191 53.5082 70.9166 52.7308 71.883 51.1761C72.8915 49.6215 73.3957 47.3525 73.3957 44.3692C73.3957 42.0582 72.9755 40.3144 72.1351 39.1379C71.2948 37.9614 70.2863 37.3731 69.1098 37.3731C67.6392 37.3731 66.3996 38.1294 65.3912 39.6421C64.3827 41.1548 63.8785 43.3607 63.8785 46.26C63.8785 48.7811 64.2987 50.6299 65.1391 51.8064C65.9794 52.9409 67.0299 53.5082 68.2905 53.5082Z" fill="currentColor"/>
      </svg>
    </Link>
  )
} 
