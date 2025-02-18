import './init-side-effects'
import $ from 'jquery'
import { reactComponentAsContainer } from './react-container'
import { PageBannerWithoutUser } from './page-banner/page-banner'

export const init = callback => {
  $('#pagebanner').replaceWith(reactComponentAsContainer(PageBannerWithoutUser))
  callback()
}
