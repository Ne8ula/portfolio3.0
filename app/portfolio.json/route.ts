import {
  derivePortfolioJson,
} from '@/lib/content/serializers'
import { PROFILE } from '@/lib/portfolio/profile'
import { PROJECTS } from '@/lib/projects/catalog'
import { SITE_URL } from '@/lib/site/site'

export function GET(): Response {
  return Response.json(derivePortfolioJson(PROFILE, PROJECTS, SITE_URL))
}
